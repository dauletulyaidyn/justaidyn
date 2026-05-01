import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { existsSync, readFileSync } from 'fs';
import nodemailer from 'nodemailer';
import { join } from 'path';
import type { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type AuthMode = 'login' | 'register';

interface GoogleOAuthConfig { clientId: string; clientSecret: string; }
interface GoogleTokenResponse { access_token?: string; error?: string; error_description?: string; }
interface GoogleUserInfo { sub: string; email: string; email_verified?: boolean; name?: string; given_name?: string; family_name?: string; picture?: string; }

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
  thinkerSubscriptionId?: string;
  thinkerSubscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'paused' | 'past_due';
  thinkerSubscribedAt?: string;
  thinkerSubscriptionUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface ProfileUpdateInput {
  firstName?: string; lastName?: string; profileTitle?: string; profileLabel?: string;
  shortBio?: string; organization?: string; location?: string; website?: string;
}

export interface PasswordResetRequestResult { resetUrl?: string; }

@Injectable()
export class AuthService {
  private readonly superadminEmail = 'aidyn.daulet@gmail.com';
  private readonly oauthStateCookie  = 'ja_oauth_state';
  private readonly sessionCookie     = 'ja_session';
  private readonly paddleConfigFile  = join(process.cwd(), 'paddle-config.json');
  private readonly sessionTtlMs      = 30 * 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  // ─── User mapping ────────────────────────────────────────────────────────────

  private mapUser(u: PrismaUser): AuthUser {
    return {
      id: u.id,
      googleSub: u.googleSub ?? '',
      email: u.email,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      profileTitle: u.profileTitle ?? undefined,
      profileLabel: u.profileLabel ?? undefined,
      shortBio: u.shortBio ?? undefined,
      organization: u.organization ?? undefined,
      location: u.location ?? undefined,
      website: u.website ?? undefined,
      picture: u.picture ?? undefined,
      passwordHash: u.passwordHash ?? undefined,
      passwordUpdatedAt: u.passwordUpdatedAt?.toISOString(),
      role: u.role === 'SUPERADMIN' ? 'superadmin' : 'client',
      paddleSubscriptionId: u.paddleSubscriptionId ?? undefined,
      paddleSubscriptionStatus: (u.paddleSubscriptionStatus as AuthUser['paddleSubscriptionStatus']) ?? undefined,
      paddleSubscribedAt: u.paddleSubscribedAt?.toISOString(),
      paddleSubscriptionUpdatedAt: u.paddleSubscriptionUpdatedAt?.toISOString(),
      thinkerSubscriptionId: u.thinkerSubscriptionId ?? undefined,
      thinkerSubscriptionStatus: (u.thinkerSubscriptionStatus as AuthUser['thinkerSubscriptionStatus']) ?? undefined,
      thinkerSubscribedAt: u.thinkerSubscribedAt?.toISOString(),
      thinkerSubscriptionUpdatedAt: u.thinkerSubscriptionUpdatedAt?.toISOString(),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      lastLoginAt: u.lastLoginAt.toISOString(),
    };
  }

  // ─── Auth resolution (called by middleware) ───────────────────────────────────

  async resolveCurrentUser(req: Request): Promise<AuthUser | null> {
    const sessionId = this.readCookie(req, this.sessionCookie);
    if (!sessionId) return null;
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    return session ? this.mapUser(session.user) : null;
  }

  getCurrentUser(req: Request): AuthUser | null {
    return (req as any)._currentUser ?? null;
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────────

  async buildGoogleWebAuthUrl(req: Request, mode: AuthMode): Promise<string> {
    const config = this.getGoogleOAuthConfig();
    const redirectUri = this.getGoogleWebRedirectUri(req);
    const state = `${mode}.${this.randomToken(32)}`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    await this.saveOAuthState(state, mode);
    return authUrl.toString();
  }

  setOAuthStateCookie(res: Response, authUrl: string, req: Request): void {
    const state = new URL(authUrl).searchParams.get('state');
    if (!state) throw new InternalServerErrorException('OAuth state was not generated.');
    res.cookie(this.oauthStateCookie, state, {
      httpOnly: true, sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: 10 * 60 * 1000, path: '/',
    });
  }

  async handleGoogleCallback(req: Request, res: Response): Promise<{ user: AuthUser; desktopRedirectUri?: string }> {
    const code  = this.getQueryValue(req.query.code);
    const state = this.getQueryValue(req.query.state);
    const error = this.getQueryValue(req.query.error);
    if (error) throw new BadRequestException(`Google OAuth failed: ${error}`);
    if (!state) throw new BadRequestException('Google OAuth callback requires state.');

    const pendingState   = await this.consumeOAuthState(state);
    const expectedState  = this.readCookie(req, this.oauthStateCookie);
    if (!pendingState && (!expectedState || expectedState !== state)) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }
    if (!code) throw new BadRequestException('Google OAuth callback requires code.');

    const mode       = pendingState?.mode ?? this.parseStateMode(state);
    const tokens     = await this.exchangeGoogleCode(req, code);
    if (!tokens.access_token) throw new UnauthorizedException('Google did not return an access token.');

    const googleUser = await this.fetchGoogleUserInfo(tokens.access_token);
    if (!googleUser.email || googleUser.email_verified === false) {
      throw new UnauthorizedException('Google account email is not verified.');
    }

    const user    = await this.upsertGoogleUser(googleUser, mode);
    const session = await this.createSession(user.id);
    res.clearCookie(this.oauthStateCookie, { path: '/' });
    res.cookie(this.sessionCookie, session.id, {
      httpOnly: true, sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: this.sessionTtlMs, path: '/',
    });
    return { user, desktopRedirectUri: pendingState?.desktopRedirectUri };
  }

  // ─── Session ──────────────────────────────────────────────────────────────────

  async logout(req: Request, res: Response): Promise<void> {
    const sessionId = this.readCookie(req, this.sessionCookie);
    if (sessionId) await this.prisma.session.deleteMany({ where: { id: sessionId } });
    res.clearCookie(this.sessionCookie, { path: '/' });
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async updateCurrentUserProfile(req: Request, input: ProfileUpdateInput): Promise<AuthUser> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    const updated = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        firstName: this.cleanText(input.firstName, 80) || currentUser.firstName,
        lastName: this.cleanText(input.lastName, 80),
        profileTitle: this.cleanText(input.profileTitle, 80) || null,
        profileLabel: this.cleanText(input.profileLabel, 120) || null,
        shortBio: this.cleanText(input.shortBio, 600) || null,
        organization: this.cleanText(input.organization, 160) || null,
        location: this.cleanText(input.location, 160) || null,
        website: this.cleanWebsite(input.website) || null,
      },
    });
    // rebuild name
    const name = [updated.firstName, updated.lastName].filter(Boolean).join(' ') || updated.email;
    if (name !== updated.name) {
      await this.prisma.user.update({ where: { id: updated.id }, data: { name } });
      updated.name = name;
    }
    return this.mapUser(updated);
  }

  async deleteCurrentUser(req: Request, res: Response): Promise<void> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    if (currentUser.email.toLowerCase() === this.superadminEmail) {
      throw new ForbiddenException('The superadmin account cannot be deleted.');
    }
    if (currentUser.paddleSubscriptionId && (currentUser.paddleSubscriptionStatus === 'active' || currentUser.paddleSubscriptionStatus === 'trialing')) {
      await this.cancelSubscriptionById(currentUser.paddleSubscriptionId);
    }
    if (currentUser.thinkerSubscriptionId && (currentUser.thinkerSubscriptionStatus === 'active' || currentUser.thinkerSubscriptionStatus === 'trialing')) {
      await this.cancelSubscriptionById(currentUser.thinkerSubscriptionId);
    }
    await this.prisma.user.delete({ where: { id: currentUser.id } });
    res.clearCookie(this.sessionCookie, { path: '/' });
  }

  // ─── Admin auth ───────────────────────────────────────────────────────────────

  async loginSuperadmin(req: Request, res: Response, email: string | undefined, password: string | undefined): Promise<AuthUser> {
    const normalizedEmail = this.cleanText(email, 240).toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' }, role: 'SUPERADMIN' },
    });
    if (normalizedEmail !== this.superadminEmail || !user?.passwordHash || !password || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid superadmin credentials.');
    }
    const session = await this.createSession(user.id);
    res.cookie(this.sessionCookie, session.id, {
      httpOnly: true, sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: this.sessionTtlMs, path: '/',
    });
    return this.mapUser(user);
  }

  getSuperadminUser(req: Request): AuthUser {
    const user = this.getCurrentUser(req);
    if (!user || user.role !== 'superadmin') throw new UnauthorizedException('Superadmin access is required.');
    return user;
  }

  async listUsersForSuperadmin(req: Request): Promise<Omit<AuthUser, 'passwordHash'>[]> {
    this.getSuperadminUser(req);
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return users.map((u) => {
      const mapped = this.mapUser(u);
      const { passwordHash: _, ...rest } = mapped;
      return rest;
    });
  }

  async setSuperadminPassword(password: string): Promise<AuthUser> {
    const clean = password?.trim();
    if (!clean || clean.length < 12) throw new BadRequestException('Password must be at least 12 characters.');
    const updated = await this.prisma.user.upsert({
      where: { email: this.superadminEmail },
      update: { role: 'SUPERADMIN', passwordHash: this.hashPassword(clean), passwordUpdatedAt: new Date() },
      create: {
        googleSub: `superadmin:${this.superadminEmail}`,
        email: this.superadminEmail,
        name: 'Superadmin',
        firstName: 'Superadmin',
        lastName: '',
        role: 'SUPERADMIN',
        passwordHash: this.hashPassword(clean),
        passwordUpdatedAt: new Date(),
      },
    });
    return this.mapUser(updated);
  }

  // ─── Password reset ───────────────────────────────────────────────────────────

  async requestSuperadminPasswordReset(req: Request, email: string | undefined): Promise<PasswordResetRequestResult> {
    const normalizedEmail = this.cleanText(email, 240).toLowerCase();
    if (normalizedEmail !== this.superadminEmail) return {};
    const user = await this.prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' }, role: 'SUPERADMIN' } });
    if (!user) return {};
    const token    = this.randomToken(48);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
    const resetUrl = `${this.getRequestOrigin(req)}/admin/password-reset/${token}`;
    const emailSent = await this.sendPasswordResetEmail(user.email, resetUrl);
    return emailSent ? {} : { resetUrl };
  }

  async verifySuperadminPasswordResetToken(req: Request, token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    return !!(record && record.user.email.toLowerCase() === this.superadminEmail);
  }

  async resetSuperadminPassword(token: string | undefined, password: string | undefined): Promise<AuthUser> {
    const cleanToken    = this.cleanText(token, 256);
    const cleanPassword = password || '';
    if (!cleanToken || cleanPassword.length < 12) {
      throw new BadRequestException('Password reset token and a password of at least 12 characters are required.');
    }
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { token: cleanToken, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record || record.user.email.toLowerCase() !== this.superadminEmail || record.user.role !== 'SUPERADMIN') {
      throw new UnauthorizedException('Password reset token is invalid or expired.');
    }
    const [updated] = await Promise.all([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: this.hashPassword(cleanPassword), passwordUpdatedAt: new Date() },
      }),
      this.prisma.passwordResetToken.delete({ where: { token: cleanToken } }),
    ]);
    return this.mapUser(updated);
  }

  // ─── Paddle: ScreenCam ────────────────────────────────────────────────────────

  async verifyCheckoutAndSave(req: Request): Promise<AuthUser> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    const sub = await this.findActiveSubscriptionByEmail(currentUser.email, 'pro_01kq54k4zhcg6hfa0k8rpvf708');
    if (!sub) throw new BadRequestException('No active ScreenCam subscription found. Please wait a moment and try again.');
    const updated = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        paddleSubscriptionId: sub.id,
        paddleSubscriptionStatus: sub.status,
        paddleSubscribedAt: currentUser.paddleSubscribedAt ? undefined : new Date(sub.createdAt),
        paddleSubscriptionUpdatedAt: new Date(),
      },
    });
    return this.mapUser(updated);
  }

  async cancelUserSubscription(req: Request): Promise<void> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    if (!currentUser.paddleSubscriptionId) throw new BadRequestException('No active subscription found.');
    await this.paddlePost(`/subscriptions/${currentUser.paddleSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });
    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { paddleSubscriptionStatus: 'canceled', paddleSubscriptionUpdatedAt: new Date() },
    });
  }

  // ─── Paddle: Thinker ─────────────────────────────────────────────────────────

  async verifyThinkerCheckoutAndSave(req: Request): Promise<AuthUser> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    const sub = await this.findActiveSubscriptionByEmail(currentUser.email, 'pro_01kq8twcm18210x96b7k9fnrbq');
    if (!sub) throw new BadRequestException('No active Thinker subscription found. Please wait a moment and try again.');
    const updated = await this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        thinkerSubscriptionId: sub.id,
        thinkerSubscriptionStatus: sub.status,
        thinkerSubscribedAt: currentUser.thinkerSubscribedAt ? undefined : new Date(sub.createdAt),
        thinkerSubscriptionUpdatedAt: new Date(),
      },
    });
    return this.mapUser(updated);
  }

  async cancelThinkerSubscription(req: Request): Promise<void> {
    const currentUser = this.getCurrentUser(req);
    if (!currentUser) throw new UnauthorizedException('Login is required.');
    if (!currentUser.thinkerSubscriptionId) throw new BadRequestException('No active Thinker subscription found.');
    await this.paddlePost(`/subscriptions/${currentUser.thinkerSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });
    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { thinkerSubscriptionStatus: 'canceled', thinkerSubscriptionUpdatedAt: new Date() },
    });
  }

  // ─── Paddle: Webhook ─────────────────────────────────────────────────────────

  verifyPaddleWebhookSignature(signatureHeader: string | undefined, rawBody: Buffer | undefined): void {
    const secret = this.getPaddleWebhookSecret();
    if (!secret) throw new InternalServerErrorException('Paddle webhook secret is not configured.');
    if (!signatureHeader || !rawBody) throw new UnauthorizedException('Missing Paddle webhook signature.');

    const parts = signatureHeader.split(';').map((part) => part.trim()).filter(Boolean);
    const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3);
    const signatures = parts.filter((part) => part.startsWith('h1=')).map((part) => part.slice(3));
    if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) {
      throw new UnauthorizedException('Invalid Paddle webhook signature header.');
    }

    const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (ageMs > 5 * 60 * 1000) {
      throw new UnauthorizedException('Paddle webhook signature timestamp is outside tolerance.');
    }

    const signedPayload = Buffer.concat([
      Buffer.from(`${timestamp}:`, 'utf-8'),
      rawBody,
    ]);
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const ok = signatures.some((signature) => {
      if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
      const actualBuffer = Buffer.from(signature, 'hex');
      return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
    });
    if (!ok) throw new UnauthorizedException('Invalid Paddle webhook signature.');
  }

  async handlePaddleWebhook(body: Record<string, unknown>): Promise<void> {
    const eventType = body.event_type as string | undefined;
    if (!eventType) return;
    const data = body.data as Record<string, unknown> | undefined;
    if (!data) return;
    const subEvents = ['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.paused', 'subscription.resumed'];
    if (!subEvents.includes(eventType)) return;
    const subscriptionId = data.id as string;
    const status         = data.status as string;
    const customer       = data.customer as Record<string, unknown> | undefined;
    const email          = customer?.email as string | undefined;
    if (!email || !subscriptionId) return;
    const items    = (data.items as Array<Record<string, unknown>>) ?? [];
    const priceId  = (items[0]?.price as Record<string, unknown>)?.id as string | undefined;
    const productId = (items[0]?.price as Record<string, unknown>)?.product_id as string | undefined;
    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) return;
    const isThinker = productId === 'pro_01kq8twcm18210x96b7k9fnrbq';
    const now = new Date();
    if (isThinker) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { thinkerSubscriptionId: subscriptionId, thinkerSubscriptionStatus: status, thinkerSubscriptionUpdatedAt: now, ...(eventType === 'subscription.created' && { thinkerSubscribedAt: now }) },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { paddleSubscriptionId: subscriptionId, paddleSubscriptionStatus: status, paddleSubscriptionUpdatedAt: now, ...(eventType === 'subscription.created' && { paddleSubscribedAt: now }) },
      });
    }
  }

  // ─── Private: session ─────────────────────────────────────────────────────────

  private async createSession(userId: string): Promise<{ id: string }> {
    const id        = this.randomToken(48);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs);
    await this.prisma.session.create({ data: { id, userId, expiresAt } });
    return { id };
  }

  // ─── Private: OAuth state ─────────────────────────────────────────────────────

  private async saveOAuthState(state: string, mode: AuthMode, desktopRedirectUri?: string): Promise<void> {
    await this.prisma.oAuthState.create({ data: { state, mode, desktopRedirectUri } });
    await this.prisma.oAuthState.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } } });
  }

  private async consumeOAuthState(state: string): Promise<{ mode: AuthMode; desktopRedirectUri?: string } | null> {
    const record = await this.prisma.oAuthState.findUnique({ where: { state } });
    if (!record || record.createdAt < new Date(Date.now() - 15 * 60 * 1000)) return null;
    await this.prisma.oAuthState.delete({ where: { state } }).catch(() => {});
    return { mode: record.mode as AuthMode, desktopRedirectUri: record.desktopRedirectUri ?? undefined };
  }

  // ─── Private: Google user upsert ──────────────────────────────────────────────

  private async upsertGoogleUser(googleUser: GoogleUserInfo, _mode: AuthMode): Promise<AuthUser> {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ googleSub: googleUser.sub }, { email: { equals: googleUser.email, mode: 'insensitive' } }] },
    });
    const isSuperadmin = googleUser.email.toLowerCase() === this.superadminEmail;
    const now = new Date();
    if (existingUser) {
      const updated = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleSub: googleUser.sub,
          email: googleUser.email,
          firstName: existingUser.firstName || googleUser.given_name || this.getFirstName(googleUser.name, googleUser.email),
          lastName: existingUser.lastName || googleUser.family_name || this.getLastName(googleUser.name),
          picture: googleUser.picture,
          lastLoginAt: now,
          ...(isSuperadmin && { role: 'SUPERADMIN' as const }),
        },
      });
      const name = [updated.firstName, updated.lastName].filter(Boolean).join(' ') || googleUser.name || googleUser.email;
      if (name !== updated.name) await this.prisma.user.update({ where: { id: updated.id }, data: { name } });
      updated.name = name;
      return this.mapUser(updated);
    }
    const firstName = googleUser.given_name || this.getFirstName(googleUser.name, googleUser.email);
    const lastName  = googleUser.family_name || this.getLastName(googleUser.name);
    const name      = [firstName, lastName].filter(Boolean).join(' ') || googleUser.name || googleUser.email;
    const created   = await this.prisma.user.create({
      data: {
        googleSub: googleUser.sub, email: googleUser.email, name, firstName, lastName,
        picture: googleUser.picture,
        role: isSuperadmin ? 'SUPERADMIN' : 'CLIENT',
        lastLoginAt: now,
      },
    });
    // Re-link Paddle subscriptions in background
    this.relinkPaddleSubscriptions(created.id, googleUser.email).catch(() => {});
    return this.mapUser(created);
  }

  private async relinkPaddleSubscriptions(userId: string, email: string): Promise<void> {
    const [screencam, thinker] = await Promise.all([
      this.findActiveSubscriptionByEmail(email, 'pro_01kq54k4zhcg6hfa0k8rpvf708'),
      this.findActiveSubscriptionByEmail(email, 'pro_01kq8twcm18210x96b7k9fnrbq'),
    ]);
    const data: Record<string, unknown> = {};
    if (screencam) { data.paddleSubscriptionId = screencam.id; data.paddleSubscriptionStatus = screencam.status; data.paddleSubscribedAt = new Date(screencam.createdAt); data.paddleSubscriptionUpdatedAt = new Date(); }
    if (thinker) { data.thinkerSubscriptionId = thinker.id; data.thinkerSubscriptionStatus = thinker.status; data.thinkerSubscribedAt = new Date(thinker.createdAt); data.thinkerSubscriptionUpdatedAt = new Date(); }
    if (Object.keys(data).length) await this.prisma.user.update({ where: { id: userId }, data: data as any });
  }

  // ─── Private: Paddle API ──────────────────────────────────────────────────────

  private getPaddleConfig(): { apiKey: string; environment: string } {
    const envKey = process.env.PADDLE_API_KEY;
    const envEnv = process.env.PADDLE_ENV;
    if (envKey) return { apiKey: envKey, environment: envEnv ?? 'production' };
    if (!existsSync(this.paddleConfigFile)) throw new InternalServerErrorException('Paddle is not configured.');
    return JSON.parse(readFileSync(this.paddleConfigFile, 'utf-8')) as { apiKey: string; environment: string };
  }

  private getPaddleWebhookSecret(): string {
    const envSecret = process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_WEBHOOK_SECRET_KEY;
    if (envSecret) return envSecret;
    if (!existsSync(this.paddleConfigFile)) return '';
    const config = JSON.parse(readFileSync(this.paddleConfigFile, 'utf-8')) as Record<string, unknown>;
    return String(config.webhookSecret || config.webhookSecretKey || config.endpointSecretKey || '');
  }

  private getPaddleApiUrl(): string {
    return this.getPaddleConfig().environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  }

  private async paddleGet(path: string): Promise<unknown> {
    const { apiKey } = this.getPaddleConfig();
    const res  = await fetch(`${this.getPaddleApiUrl()}${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new BadRequestException((json.error as Record<string, unknown>)?.detail ?? 'Paddle API error.');
    return json.data ?? json;
  }

  private async paddlePost(path: string, body: Record<string, unknown>): Promise<unknown> {
    const { apiKey } = this.getPaddleConfig();
    const res  = await fetch(`${this.getPaddleApiUrl()}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok) throw new BadRequestException((json.error as Record<string, unknown>)?.detail ?? 'Paddle API error.');
    return json.data ?? json;
  }

  async cancelSubscriptionById(subscriptionId: string): Promise<void> {
    try { await this.paddlePost(`/subscriptions/${subscriptionId}/cancel`, { effective_from: 'next_billing_period' }); } catch { /* best-effort */ }
  }

  async findActiveSubscriptionByEmail(email: string, productId?: string): Promise<{ id: string; status: string; createdAt: string } | null> {
    try {
      const customers = (await this.paddleGet(`/customers?search=${encodeURIComponent(email)}`)) as Array<Record<string, unknown>>;
      const list      = Array.isArray(customers) ? customers : [];
      const customer  = list.find((c) => (c.email as string)?.toLowerCase() === email.toLowerCase());
      if (!customer) return null;
      const subs = (await this.paddleGet(`/subscriptions?customer_id=${customer.id}`)) as Array<Record<string, unknown>>;
      const subList = Array.isArray(subs) ? subs : [];
      const active = subList.find((s) => {
        const isActive = s.status === 'active' || s.status === 'trialing';
        if (!isActive) return false;
        if (!productId) return true;
        const items    = (s.items as Array<Record<string, unknown>>) ?? [];
        const pId      = (items[0]?.price as Record<string, unknown>)?.product_id as string | undefined;
        return pId === productId;
      });
      if (!active) return null;
      return { id: active.id as string, status: active.status as string, createdAt: active.created_at as string };
    } catch { return null; }
  }

  // ─── Private: helpers ─────────────────────────────────────────────────────────

  private async exchangeGoogleCode(req: Request, code: string): Promise<GoogleTokenResponse> {
    const config = this.getGoogleOAuthConfig();
    const body   = new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: this.getGoogleWebRedirectUri(req), grant_type: 'authorization_code' });
    const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    const tokens = (await response.json()) as GoogleTokenResponse;
    if (!response.ok || tokens.error) throw new UnauthorizedException(tokens.error_description || tokens.error || 'Google token exchange failed.');
    return tokens;
  }

  private async fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const userInfo = (await response.json()) as Partial<GoogleUserInfo>;
    if (!response.ok || !userInfo.sub || !userInfo.email) throw new UnauthorizedException('Google user profile request failed.');
    return userInfo as GoogleUserInfo;
  }

  private parseStateMode(state: string): AuthMode {
    if (state.startsWith('login.')) return 'login';
    if (state.startsWith('register.')) return 'register';
    throw new BadRequestException('Invalid OAuth state mode.');
  }

  private getGoogleWebRedirectUri(req: Request): string {
    const override = process.env.GOOGLE_REDIRECT_URI;
    if (override) return override;
    const host   = req.hostname?.toLowerCase().split(':')[0];
    const origin = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
    return `${origin}/auth/google/callback`;
  }

  private getRequestOrigin(req: Request): string {
    const host = req.hostname?.toLowerCase().split(':')[0];
    return host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
  }

  private getGoogleOAuthConfig(): GoogleOAuthConfig {
    const envClientId     = process.env.GOOGLE_CLIENT_ID;
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (envClientId && envClientSecret) return { clientId: envClientId, clientSecret: envClientSecret };
    const configPath = join(process.cwd(), 'google-oauth.json');
    if (!existsSync(configPath)) throw new InternalServerErrorException('google-oauth.json was not found and GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.');
    const rawConfig   = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const configBlock = (rawConfig.web || rawConfig.installed || rawConfig) as Record<string, unknown>;
    const clientId    = typeof configBlock.client_id    === 'string' ? configBlock.client_id    : undefined;
    const clientSecret = typeof configBlock.client_secret === 'string' ? configBlock.client_secret : undefined;
    if (!clientId || !clientSecret) throw new InternalServerErrorException('Google OAuth config must contain client_id and client_secret.');
    return { clientId, clientSecret };
  }

  private isSecureRequest(req: Request): boolean {
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
  }

  private readCookie(req: Request, name: string): string | undefined {
    const cookies = req.headers.cookie ?? '';
    const match   = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
  }

  private getFirstName(fullName: string | undefined, email: string): string {
    const trimmed = fullName?.trim();
    if (!trimmed) return email.split('@')[0];
    return trimmed.split(/\s+/)[0] || trimmed;
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
    if (!website) return '';
    return /^https?:\/\//i.test(website) ? website : `https://${website}`;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [algorithm, saltValue, hashValue] = storedHash.split('$');
    if (algorithm !== 'scrypt' || !saltValue || !hashValue) return false;
    try {
      const salt         = Buffer.from(saltValue, 'hex');
      const expectedHash = Buffer.from(hashValue, 'hex');
      const actualHash   = scryptSync(password, salt, expectedHash.length);
      return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
    } catch { return false; }
  }

  private randomToken(bytes: number): string {
    return randomBytes(bytes).toString('base64url');
  }

  // ─── Desktop OAuth ────────────────────────────────────────────────────────────

  private readonly apiTokenTtlMs = 90 * 24 * 60 * 60 * 1000;
  private readonly desktopChallengeCookie = 'ja_desktop_challenge';

  async buildGoogleWebAuthUrlForDesktop(req: Request, res: Response, mode: AuthMode, desktopRedirectUri: string, codeChallenge: string): Promise<string> {
    const config = this.getGoogleOAuthConfig();
    const redirectUri = this.getGoogleWebRedirectUri(req);
    const state = `${mode}.${this.randomToken(32)}`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);
    await this.saveOAuthState(state, mode, desktopRedirectUri);
    res.cookie(this.desktopChallengeCookie, codeChallenge, {
      httpOnly: true, sameSite: 'lax',
      secure: this.isSecureRequest(req),
      maxAge: 15 * 60 * 1000, path: '/',
    });
    return authUrl.toString();
  }

  readDesktopChallengeCookie(req: Request, res: Response): string | undefined {
    const challenge = this.readCookie(req, this.desktopChallengeCookie);
    if (challenge) res.clearCookie(this.desktopChallengeCookie, { path: '/' });
    return challenge || undefined;
  }

  async createDesktopOtc(userId: string, redirectUri: string, codeChallenge: string): Promise<string> {
    const token = this.randomToken(32);
    const expiresAt = new Date(Date.now() + 60 * 1000);
    await this.prisma.desktopOtc.create({ data: { token, userId, redirectUri, codeChallenge, expiresAt } });
    await this.prisma.desktopOtc.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } } });
    return token;
  }

  async exchangeDesktopOtc(otcToken: string, codeVerifier: string): Promise<{ accessToken: string; user: AuthUser }> {
    const record = await this.prisma.desktopOtc.findUnique({ where: { token: otcToken } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired one-time code.');
    }
    const expected = createHash('sha256').update(codeVerifier).digest('base64url');
    if (expected !== record.codeChallenge) {
      throw new UnauthorizedException('PKCE verification failed.');
    }
    await this.prisma.desktopOtc.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    const accessToken = this.randomToken(48);
    const expiresAt = new Date(Date.now() + this.apiTokenTtlMs);
    await this.prisma.apiToken.create({ data: { token: accessToken, userId: record.userId, expiresAt } });
    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new UnauthorizedException('User not found.');
    return { accessToken, user: this.mapUser(user) };
  }

  async verifyBearerToken(req: Request): Promise<AuthUser | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    if (!token) return null;
    const record = await this.prisma.apiToken.findUnique({ where: { token }, include: { user: true } });
    if (!record || record.expiresAt < new Date()) return null;
    this.prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    return this.mapUser(record.user);
  }

  // ─── Private: helpers ─────────────────────────────────────────────────────────

  private getQueryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
    return typeof value === 'string' ? value : undefined;
  }

  private async sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
    const host = process.env.SMTP_HOST; const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER; const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass || !from) return false;
    try {
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await transporter.sendMail({ from, to: email, subject: 'JustAidyn superadmin password reset', text: `Use this link to reset the JustAidyn superadmin password. The link expires in 30 minutes.\n\n${resetUrl}` });
      return true;
    } catch { return false; }
  }
}
