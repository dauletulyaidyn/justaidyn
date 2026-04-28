import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import nodemailer from 'nodemailer';
import { join } from 'path';

type AuthMode = 'login' | 'register';

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface AuthUser {
  id: string;
  googleSub: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  profileTitle?: string;
  profileLabel?: string;
  shortBio?: string;
  organization?: string;
  location?: string;
  website?: string;
  picture?: string;
  passwordHash?: string;
  passwordUpdatedAt?: string;
  role: 'client' | 'superadmin';
  paddleSubscriptionId?: string;
  paddleSubscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'paused' | 'past_due';
  paddleSubscribedAt?: string;
  paddleSubscriptionUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  profileTitle?: string;
  profileLabel?: string;
  shortBio?: string;
  organization?: string;
  location?: string;
  website?: string;
}

interface AuthUsersFile {
  users: AuthUser[];
}

interface AuthSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthSessionsFile {
  sessions: AuthSession[];
}

interface PendingOAuthState {
  state: string;
  mode: AuthMode;
  createdAt: string;
  expiresAt: string;
}

interface AuthOAuthStatesFile {
  states: PendingOAuthState[];
}

interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

interface PasswordResetTokensFile {
  tokens: PasswordResetToken[];
}

export interface PasswordResetRequestResult {
  resetUrl?: string;
}

@Injectable()
export class AuthService {
  private readonly superadminEmail = 'aidyn.daulet@gmail.com';
  private readonly oauthStateCookie = 'ja_oauth_state';
  private readonly sessionCookie = 'ja_session';
  private readonly dataDir = join(process.cwd(), 'data');
  private readonly usersFile = join(this.dataDir, 'auth-users.json');
  private readonly sessionsFile = join(this.dataDir, 'auth-sessions.json');
  private readonly oauthStatesFile = join(this.dataDir, 'auth-oauth-states.json');
  private readonly paddleConfigFile = join(process.cwd(), 'paddle-config.json');
  private readonly passwordResetTokensFile = join(this.dataDir, 'auth-password-reset-tokens.json');

  buildGoogleWebAuthUrl(req: Request, mode: AuthMode): string {
    const config = this.getGoogleOAuthConfig();
    const redirectUri = this.getGoogleWebRedirectUri(req);
    const state = `${mode}.${this.randomToken(32)}`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

    this.saveOAuthState(state, mode);

    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return authUrl.toString();
  }

  setOAuthStateCookie(res: Response, authUrl: string, req: Request) {
    const state = new URL(authUrl).searchParams.get('state');
    if (!state) {
      throw new InternalServerErrorException('OAuth state was not generated.');
    }

    res.cookie(this.oauthStateCookie, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
  }

  async handleGoogleCallback(req: Request, res: Response): Promise<AuthUser> {
    const code = this.getQueryValue(req.query.code);
    const state = this.getQueryValue(req.query.state);
    const error = this.getQueryValue(req.query.error);

    if (error) {
      throw new BadRequestException(`Google OAuth failed: ${error}`);
    }

    if (!state) {
      throw new BadRequestException('Google OAuth callback requires state.');
    }

    const pendingState = this.consumeOAuthState(state);
    const expectedState = this.readCookie(req, this.oauthStateCookie);
    if (!pendingState && (!expectedState || expectedState !== state)) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }

    if (!code) {
      throw new BadRequestException('Google OAuth callback requires code.');
    }

    const mode = pendingState?.mode ?? this.parseStateMode(state);
    const tokens = await this.exchangeGoogleCode(req, code);
    if (!tokens.access_token) {
      throw new UnauthorizedException('Google did not return an access token.');
    }

    const googleUser = await this.fetchGoogleUserInfo(tokens.access_token);
    if (!googleUser.email || googleUser.email_verified === false) {
      throw new UnauthorizedException('Google account email is not verified.');
    }

    const user = this.upsertGoogleUser(googleUser, mode);
    const session = this.createSession(user.id);

    res.clearCookie(this.oauthStateCookie, { path: '/' });
    res.cookie(this.sessionCookie, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return user;
  }

  getCurrentUser(req: Request): AuthUser | null {
    const sessionId = this.readCookie(req, this.sessionCookie);
    if (!sessionId) {
      return null;
    }

    const sessionsFile = this.readSessionsFile();
    const now = Date.now();
    const session = sessionsFile.sessions.find((item) => item.id === sessionId && Date.parse(item.expiresAt) > now);
    if (!session) {
      return null;
    }

    return this.readUsersFile().users.find((user) => user.id === session.userId) ?? null;
  }

  logout(req: Request, res: Response) {
    const sessionId = this.readCookie(req, this.sessionCookie);
    if (sessionId) {
      const sessionsFile = this.readSessionsFile();
      sessionsFile.sessions = sessionsFile.sessions.filter((session) => session.id !== sessionId);
      this.writeJson(this.sessionsFile, sessionsFile);
    }

    res.clearCookie(this.sessionCookie, { path: '/' });
  }

  updateCurrentUserProfile(req: Request, input: ProfileUpdateInput): AuthUser {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) {
      throw new UnauthorizedException('Login is required.');
    }

    const usersFile = this.readUsersFile();
    const user = usersFile.users.find((item) => item.id === currentUser.id);
    if (!user) {
      throw new UnauthorizedException('Login is required.');
    }

    user.firstName = this.cleanText(input.firstName, 80) || user.firstName;
    user.lastName = this.cleanText(input.lastName, 80);
    user.profileTitle = this.cleanText(input.profileTitle, 80);
    user.profileLabel = this.cleanText(input.profileLabel, 120);
    user.shortBio = this.cleanText(input.shortBio, 600);
    user.organization = this.cleanText(input.organization, 160);
    user.location = this.cleanText(input.location, 160);
    user.website = this.cleanWebsite(input.website);
    user.name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    user.updatedAt = new Date().toISOString();

    this.writeJson(this.usersFile, usersFile);
    return user;
  }

  async deleteCurrentUser(req: Request, res: Response): Promise<void> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) {
      throw new UnauthorizedException('Login is required.');
    }

    if (currentUser.email.toLowerCase() === this.superadminEmail) {
      throw new ForbiddenException('The superadmin account cannot be deleted.');
    }

    if (currentUser.paddleSubscriptionId && (currentUser.paddleSubscriptionStatus === 'active' || currentUser.paddleSubscriptionStatus === 'trialing')) {
      await this.cancelSubscriptionById(currentUser.paddleSubscriptionId);
    }

    const usersFile = this.readUsersFile();
    usersFile.users = usersFile.users.filter((user) => user.id !== currentUser.id);
    this.writeJson(this.usersFile, usersFile);

    const sessionsFile = this.readSessionsFile();
    sessionsFile.sessions = sessionsFile.sessions.filter((session) => session.userId !== currentUser.id);
    this.writeJson(this.sessionsFile, sessionsFile);
    res.clearCookie(this.sessionCookie, { path: '/' });
  }

  loginSuperadmin(req: Request, res: Response, email: string | undefined, password: string | undefined): AuthUser {
    const normalizedEmail = this.cleanText(email, 240).toLowerCase();
    const user = this.readUsersFile().users.find((item) => item.email.toLowerCase() === normalizedEmail && item.role === 'superadmin');

    if (normalizedEmail !== this.superadminEmail || !user?.passwordHash || !password || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid superadmin credentials.');
    }

    const session = this.createSession(user.id);
    res.cookie(this.sessionCookie, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return user;
  }

  ensureSuperadmin(password: string): AuthUser {
    const usersFile = this.readUsersFile();
    const now = new Date().toISOString();
    let superadmin = usersFile.users.find((user) => user.email.toLowerCase() === this.superadminEmail);

    for (const user of usersFile.users) {
      if (user.email.toLowerCase() !== this.superadminEmail && user.role === 'superadmin') {
        user.role = 'client';
        user.updatedAt = now;
      }
    }

    if (!superadmin) {
      superadmin = {
        id: this.randomToken(24),
        googleSub: `superadmin:${this.superadminEmail}`,
        email: this.superadminEmail,
        name: 'Aidyn Dauletuly',
        firstName: 'Aidyn',
        lastName: 'Dauletuly',
        role: 'superadmin',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      usersFile.users.push(superadmin);
    }

    superadmin.role = 'superadmin';
    superadmin.passwordHash = this.hashPassword(password);
    superadmin.passwordUpdatedAt = now;
    superadmin.updatedAt = now;
    this.writeJson(this.usersFile, usersFile);

    return superadmin;
  }

  getSuperadminUser(req: Request): AuthUser {
    const user = this.getCurrentUser(req);
    if (!user || user.role !== 'superadmin') {
      throw new UnauthorizedException('Superadmin access is required.');
    }

    return user;
  }

  listUsersForSuperadmin(req: Request): AuthUser[] {
    this.getSuperadminUser(req);
    return this.readUsersFile().users.map((user) => ({ ...user, passwordHash: user.passwordHash ? '[set]' : undefined }));
  }

  async requestSuperadminPasswordReset(req: Request, email: string | undefined): Promise<PasswordResetRequestResult> {
    const normalizedEmail = this.cleanText(email, 240).toLowerCase();
    if (normalizedEmail !== this.superadminEmail) {
      return {};
    }

    const user = this.readUsersFile().users.find((item) => item.email.toLowerCase() === this.superadminEmail && item.role === 'superadmin');
    if (!user) {
      return {};
    }

    const now = new Date();
    const token = this.randomToken(48);
    const tokensFile = this.readPasswordResetTokensFile();
    const currentTime = now.getTime();
    tokensFile.tokens = tokensFile.tokens.filter((item) => !item.usedAt && Date.parse(item.expiresAt) > currentTime);
    tokensFile.tokens.push({
      token,
      userId: user.id,
      email: user.email,
      createdAt: now.toISOString(),
      expiresAt: new Date(currentTime + 30 * 60 * 1000).toISOString(),
    });
    this.writeJson(this.passwordResetTokensFile, tokensFile);

    const resetUrl = `${this.getRequestOrigin(req)}/admin/password-reset/${token}`;
    const emailSent = await this.sendPasswordResetEmail(user.email, resetUrl);

    return emailSent ? {} : { resetUrl };
  }

  resetSuperadminPassword(token: string | undefined, password: string | undefined): AuthUser {
    const cleanToken = this.cleanText(token, 256);
    const cleanPassword = password || '';
    if (!cleanToken || cleanPassword.length < 12) {
      throw new BadRequestException('Password reset token and a password of at least 12 characters are required.');
    }

    const tokensFile = this.readPasswordResetTokensFile();
    const now = new Date();
    const resetToken = tokensFile.tokens.find((item) => item.token === cleanToken && !item.usedAt && Date.parse(item.expiresAt) > now.getTime());
    if (!resetToken) {
      throw new UnauthorizedException('Password reset token is invalid or expired.');
    }

    const usersFile = this.readUsersFile();
    const user = usersFile.users.find((item) => item.id === resetToken.userId && item.email.toLowerCase() === this.superadminEmail && item.role === 'superadmin');
    if (!user) {
      throw new UnauthorizedException('Password reset token is invalid.');
    }

    user.passwordHash = this.hashPassword(cleanPassword);
    user.passwordUpdatedAt = now.toISOString();
    user.updatedAt = now.toISOString();
    resetToken.usedAt = now.toISOString();

    this.writeJson(this.usersFile, usersFile);
    this.writeJson(this.passwordResetTokensFile, tokensFile);
    return user;
  }

  private async exchangeGoogleCode(req: Request, code: string): Promise<GoogleTokenResponse> {
    const config = this.getGoogleOAuthConfig();
    const body = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: this.getGoogleWebRedirectUri(req),
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const tokens = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || tokens.error) {
      throw new UnauthorizedException(tokens.error_description || tokens.error || 'Google token exchange failed.');
    }

    return tokens;
  }

  private async fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = (await response.json()) as Partial<GoogleUserInfo>;

    if (!response.ok || !userInfo.sub || !userInfo.email) {
      throw new UnauthorizedException('Google user profile request failed.');
    }

    return userInfo as GoogleUserInfo;
  }

  private upsertGoogleUser(googleUser: GoogleUserInfo, mode: AuthMode): AuthUser {
    const usersFile = this.readUsersFile();
    const now = new Date().toISOString();
    const existingUser = usersFile.users.find((user) => user.googleSub === googleUser.sub || user.email.toLowerCase() === googleUser.email.toLowerCase());

    if (existingUser) {
      existingUser.googleSub = googleUser.sub;
      existingUser.email = googleUser.email;
      existingUser.firstName = existingUser.firstName || googleUser.given_name || this.getFirstName(googleUser.name, googleUser.email);
      existingUser.lastName = existingUser.lastName || googleUser.family_name || this.getLastName(googleUser.name);
      existingUser.name = [existingUser.firstName, existingUser.lastName].filter(Boolean).join(' ') || googleUser.name || googleUser.email;
      existingUser.picture = googleUser.picture;
      existingUser.updatedAt = now;
      existingUser.lastLoginAt = now;
      if (googleUser.email.toLowerCase() === this.superadminEmail) {
        existingUser.role = 'superadmin';
      }
      this.writeJson(this.usersFile, usersFile);
      return existingUser;
    }

    const user: AuthUser = {
      id: this.randomToken(24),
      googleSub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name || googleUser.email,
      firstName: googleUser.given_name || this.getFirstName(googleUser.name, googleUser.email),
      lastName: googleUser.family_name || this.getLastName(googleUser.name),
      picture: googleUser.picture,
      role: 'client',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    usersFile.users.push(user);

    // Re-link any existing Paddle subscription for this email (e.g. after account re-creation)
    this.findActiveSubscriptionByEmail(googleUser.email).then((sub) => {
      if (!sub) return;
      const file = this.readUsersFile();
      const dbUser = file.users.find((u) => u.id === user.id);
      if (!dbUser) return;
      dbUser.paddleSubscriptionId = sub.id;
      dbUser.paddleSubscriptionStatus = sub.status as AuthUser['paddleSubscriptionStatus'];
      dbUser.paddleSubscribedAt = sub.createdAt;
      dbUser.paddleSubscriptionUpdatedAt = new Date().toISOString();
      this.writeJson(this.usersFile, file);
    }).catch(() => {});

    this.writeJson(this.usersFile, usersFile);
    return user;
  }

  private createSession(userId: string): AuthSession {
    const sessionsFile = this.readSessionsFile();
    const now = new Date();
    const session: AuthSession = {
      id: this.randomToken(48),
      userId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const currentTime = Date.now();
    sessionsFile.sessions = sessionsFile.sessions.filter((item) => Date.parse(item.expiresAt) > currentTime);
    sessionsFile.sessions.push(session);
    this.writeJson(this.sessionsFile, sessionsFile);

    return session;
  }

  private saveOAuthState(state: string, mode: AuthMode) {
    const statesFile = this.readOAuthStatesFile();
    const now = new Date();
    const currentTime = now.getTime();

    statesFile.states = statesFile.states.filter((item) => Date.parse(item.expiresAt) > currentTime);
    statesFile.states.push({
      state,
      mode,
      createdAt: now.toISOString(),
      expiresAt: new Date(currentTime + 10 * 60 * 1000).toISOString(),
    });

    this.writeJson(this.oauthStatesFile, statesFile);
  }

  private consumeOAuthState(state: string): PendingOAuthState | null {
    const statesFile = this.readOAuthStatesFile();
    const currentTime = Date.now();
    const pendingState = statesFile.states.find((item) => item.state === state && Date.parse(item.expiresAt) > currentTime) ?? null;

    statesFile.states = statesFile.states.filter((item) => item.state !== state && Date.parse(item.expiresAt) > currentTime);
    this.writeJson(this.oauthStatesFile, statesFile);

    return pendingState;
  }

  private parseStateMode(state: string): AuthMode {
    if (state.startsWith('login.')) {
      return 'login';
    }

    if (state.startsWith('register.')) {
      return 'register';
    }

    throw new BadRequestException('Invalid OAuth state mode.');
  }

  private getGoogleWebRedirectUri(req: Request): string {
    const override = process.env.GOOGLE_REDIRECT_URI;
    if (override) {
      return override;
    }

    const host = req.hostname?.toLowerCase().split(':')[0];
    const origin = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
    return `${origin}/auth/google/callback`;
  }

  private getFirstName(fullName: string | undefined, email: string): string {
    const trimmedName = fullName?.trim();
    if (!trimmedName) {
      return email.split('@')[0];
    }

    return trimmedName.split(/\s+/)[0] || trimmedName;
  }

  private getLastName(fullName: string | undefined): string {
    const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  private cleanText(value: string | undefined, maxLength: number): string {
    return (value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  private cleanWebsite(value: string | undefined): string {
    const website = this.cleanText(value, 240);
    if (!website) {
      return '';
    }

    if (/^https?:\/\//i.test(website)) {
      return website;
    }

    return `https://${website}`;
  }

  private getGoogleOAuthConfig(): GoogleOAuthConfig {
    const envClientId = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (envClientId && envClientSecret) {
      return { clientId: envClientId, clientSecret: envClientSecret };
    }

    const configPath = join(process.cwd(), 'google-oauth.json');
    if (!existsSync(configPath)) {
      throw new InternalServerErrorException('google-oauth.json was not found and GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.');
    }

    const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const configBlock = (rawConfig.web || rawConfig.installed || rawConfig) as Record<string, unknown>;
    const clientId = typeof configBlock.client_id === 'string' ? configBlock.client_id : undefined;
    const clientSecret = typeof configBlock.client_secret === 'string' ? configBlock.client_secret : undefined;

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Google OAuth config must contain client_id and client_secret.');
    }

    return { clientId, clientSecret };
  }

  private readUsersFile(): AuthUsersFile {
    return this.readJson<AuthUsersFile>(this.usersFile, { users: [] });
  }

  private readSessionsFile(): AuthSessionsFile {
    return this.readJson<AuthSessionsFile>(this.sessionsFile, { sessions: [] });
  }

  private readOAuthStatesFile(): AuthOAuthStatesFile {
    return this.readJson<AuthOAuthStatesFile>(this.oauthStatesFile, { states: [] });
  }

  private readPasswordResetTokensFile(): PasswordResetTokensFile {
    return this.readJson<PasswordResetTokensFile>(this.passwordResetTokensFile, { tokens: [] });
  }

  private readJson<T>(filePath: string, fallback: T): T {
    this.ensureDataDir();
    if (!existsSync(filePath)) {
      this.writeJson(filePath, fallback);
      return fallback;
    }

    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  }

  private writeJson(filePath: string, value: unknown) {
    this.ensureDataDir();
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }

  private ensureDataDir() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private readCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));
    if (!cookie) {
      return undefined;
    }

    return decodeURIComponent(cookie.slice(name.length + 1));
  }

  private isSecureRequest(req: Request): boolean {
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
  }

  private getRequestOrigin(req: Request): string {
    const protocol = this.isSecureRequest(req) ? 'https' : 'http';
    return `${protocol}://${req.get('host') || 'localhost:3000'}`;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, saltValue, hashValue] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) {
      return false;
    }

    const salt = Buffer.from(saltValue, 'base64url');
    const expectedHash = Buffer.from(hashValue, 'base64url');
    const actualHash = scryptSync(password, salt, expectedHash.length);
    return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
  }

  private async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      return false;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'JustAidyn superadmin password reset',
      text: `Use this link to reset the JustAidyn superadmin password. The link expires in 30 minutes.\n\n${resetUrl}`,
    });

    return true;
  }

  private randomToken(bytes: number): string {
    return randomBytes(bytes).toString('base64url');
  }

  private getPaddleConfig(): { apiKey: string; environment: string } {
    const envKey = process.env.PADDLE_API_KEY;
    const envEnv = process.env.PADDLE_ENV;
    if (envKey) return { apiKey: envKey, environment: envEnv ?? 'production' };
    if (!existsSync(this.paddleConfigFile)) throw new InternalServerErrorException('Paddle is not configured.');
    return JSON.parse(readFileSync(this.paddleConfigFile, 'utf-8')) as { apiKey: string; environment: string };
  }

  private getPaddleApiUrl(): string {
    const { environment } = this.getPaddleConfig();
    return environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  }

  private async paddleGet(path: string): Promise<Record<string, unknown>> {
    const { apiKey } = this.getPaddleConfig();
    const res = await fetch(`${this.getPaddleApiUrl()}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new BadRequestException((json.error as Record<string, unknown>)?.detail ?? 'Paddle API error.');
    return (json.data ?? json) as Record<string, unknown>;
  }

  private async paddlePost(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { apiKey } = this.getPaddleConfig();
    const res = await fetch(`${this.getPaddleApiUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new BadRequestException((json.error as Record<string, unknown>)?.detail ?? 'Paddle API error.');
    return (json.data ?? json) as Record<string, unknown>;
  }

  async verifyCheckoutAndSave(req: Request): Promise<AuthUser> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');

    const sub = await this.findActiveSubscriptionByEmail(currentUser.email);
    if (!sub) throw new BadRequestException('No active subscription found. Please wait a moment and try again.');

    const usersFile = this.readUsersFile();
    const dbUser = usersFile.users.find((u) => u.id === currentUser.id);
    if (!dbUser) throw new UnauthorizedException('User not found.');

    const now = new Date().toISOString();
    dbUser.paddleSubscriptionId = sub.id;
    dbUser.paddleSubscriptionStatus = sub.status as AuthUser['paddleSubscriptionStatus'];
    dbUser.paddleSubscribedAt = dbUser.paddleSubscribedAt ?? now;
    dbUser.paddleSubscriptionUpdatedAt = now;
    this.writeJson(this.usersFile, usersFile);
    return dbUser;
  }

  async cancelUserSubscription(req: Request): Promise<void> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    if (!currentUser.paddleSubscriptionId) throw new BadRequestException('No active subscription found.');

    await this.paddlePost(`/subscriptions/${currentUser.paddleSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });

    const usersFile = this.readUsersFile();
    const dbUser = usersFile.users.find((u) => u.id === currentUser.id);
    if (dbUser) {
      dbUser.paddleSubscriptionStatus = 'canceled';
      dbUser.paddleSubscriptionUpdatedAt = new Date().toISOString();
      this.writeJson(this.usersFile, usersFile);
    }
  }

  private async cancelSubscriptionById(subscriptionId: string): Promise<void> {
    try {
      await this.paddlePost(`/subscriptions/${subscriptionId}/cancel`, { effective_from: 'next_billing_period' });
    } catch {
      // best-effort
    }
  }

  private async findActiveSubscriptionByEmail(email: string): Promise<{ id: string; status: string; createdAt: string } | null> {
    try {
      const customers = (await this.paddleGet(`/customers?search=${encodeURIComponent(email)}`)) as unknown;
      const list = Array.isArray(customers) ? customers : ((customers as Record<string, unknown>).items as unknown[]) ?? [];
      const customer = (list as Array<Record<string, unknown>>).find((c) => (c.email as string)?.toLowerCase() === email.toLowerCase());
      if (!customer) return null;

      const subs = (await this.paddleGet(`/subscriptions?customer_id=${customer.id}`)) as unknown;
      const subList = Array.isArray(subs) ? subs : ((subs as Record<string, unknown>).items as unknown[]) ?? [];
      const active = (subList as Array<Record<string, unknown>>).find((s) => s.status === 'active' || s.status === 'trialing');
      if (!active) return null;

      return { id: active.id as string, status: active.status as string, createdAt: active.created_at as string };
    } catch {
      return null;
    }
  }

  private getQueryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  handlePaddleWebhook(body: Record<string, unknown>): void {
    const eventType = body.event_type as string | undefined;
    if (!eventType) return;

    const data = body.data as Record<string, unknown> | undefined;
    if (!data) return;

    const statusMap: Record<string, AuthUser['paddleSubscriptionStatus']> = {
      active: 'active',
      trialing: 'trialing',
      canceled: 'canceled',
      paused: 'paused',
      past_due: 'past_due',
    };

    if (['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.paused', 'subscription.resumed'].includes(eventType)) {
      const subscriptionId = data.id as string | undefined;
      const status = statusMap[data.status as string] ?? 'active';
      const customer = data.customer as Record<string, unknown> | undefined;
      const email = customer?.email as string | undefined;

      if (!email || !subscriptionId) return;

      const usersFile = this.readUsersFile();
      const user = usersFile.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return;

      const now = new Date().toISOString();
      user.paddleSubscriptionId = subscriptionId;
      user.paddleSubscriptionStatus = status;
      user.paddleSubscriptionUpdatedAt = now;
      if (eventType === 'subscription.created') {
        user.paddleSubscribedAt = now;
      }
      this.writeJson(this.usersFile, usersFile);
    }
  }
}
