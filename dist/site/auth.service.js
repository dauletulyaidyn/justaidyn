"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = require("path");
let AuthService = class AuthService {
    constructor() {
        this.superadminEmail = 'aidyn.daulet@gmail.com';
        this.oauthStateCookie = 'ja_oauth_state';
        this.sessionCookie = 'ja_session';
        this.dataDir = (0, path_1.join)(process.cwd(), 'data');
        this.usersFile = (0, path_1.join)(this.dataDir, 'auth-users.json');
        this.sessionsFile = (0, path_1.join)(this.dataDir, 'auth-sessions.json');
        this.oauthStatesFile = (0, path_1.join)(this.dataDir, 'auth-oauth-states.json');
        this.paddleConfigFile = (0, path_1.join)(process.cwd(), 'paddle-config.json');
        this.passwordResetTokensFile = (0, path_1.join)(this.dataDir, 'auth-password-reset-tokens.json');
    }
    buildGoogleWebAuthUrl(req, mode) {
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
    setOAuthStateCookie(res, authUrl, req) {
        const state = new URL(authUrl).searchParams.get('state');
        if (!state) {
            throw new common_1.InternalServerErrorException('OAuth state was not generated.');
        }
        res.cookie(this.oauthStateCookie, state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.isSecureRequest(req),
            maxAge: 10 * 60 * 1000,
            path: '/',
        });
    }
    async handleGoogleCallback(req, res) {
        const code = this.getQueryValue(req.query.code);
        const state = this.getQueryValue(req.query.state);
        const error = this.getQueryValue(req.query.error);
        if (error) {
            throw new common_1.BadRequestException(`Google OAuth failed: ${error}`);
        }
        if (!state) {
            throw new common_1.BadRequestException('Google OAuth callback requires state.');
        }
        const pendingState = this.consumeOAuthState(state);
        const expectedState = this.readCookie(req, this.oauthStateCookie);
        if (!pendingState && (!expectedState || expectedState !== state)) {
            throw new common_1.UnauthorizedException('Invalid OAuth state.');
        }
        if (!code) {
            throw new common_1.BadRequestException('Google OAuth callback requires code.');
        }
        const mode = pendingState?.mode ?? this.parseStateMode(state);
        const tokens = await this.exchangeGoogleCode(req, code);
        if (!tokens.access_token) {
            throw new common_1.UnauthorizedException('Google did not return an access token.');
        }
        const googleUser = await this.fetchGoogleUserInfo(tokens.access_token);
        if (!googleUser.email || googleUser.email_verified === false) {
            throw new common_1.UnauthorizedException('Google account email is not verified.');
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
    getCurrentUser(req) {
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
    logout(req, res) {
        const sessionId = this.readCookie(req, this.sessionCookie);
        if (sessionId) {
            const sessionsFile = this.readSessionsFile();
            sessionsFile.sessions = sessionsFile.sessions.filter((session) => session.id !== sessionId);
            this.writeJson(this.sessionsFile, sessionsFile);
        }
        res.clearCookie(this.sessionCookie, { path: '/' });
    }
    updateCurrentUserProfile(req, input) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser) {
            throw new common_1.UnauthorizedException('Login is required.');
        }
        const usersFile = this.readUsersFile();
        const user = usersFile.users.find((item) => item.id === currentUser.id);
        if (!user) {
            throw new common_1.UnauthorizedException('Login is required.');
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
    async deleteCurrentUser(req, res) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser) {
            throw new common_1.UnauthorizedException('Login is required.');
        }
        if (currentUser.email.toLowerCase() === this.superadminEmail) {
            throw new common_1.ForbiddenException('The superadmin account cannot be deleted.');
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
    loginSuperadmin(req, res, email, password) {
        const normalizedEmail = this.cleanText(email, 240).toLowerCase();
        const user = this.readUsersFile().users.find((item) => item.email.toLowerCase() === normalizedEmail && item.role === 'superadmin');
        if (normalizedEmail !== this.superadminEmail || !user?.passwordHash || !password || !this.verifyPassword(password, user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid superadmin credentials.');
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
    ensureSuperadmin(password) {
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
    getSuperadminUser(req) {
        const user = this.getCurrentUser(req);
        if (!user || user.role !== 'superadmin') {
            throw new common_1.UnauthorizedException('Superadmin access is required.');
        }
        return user;
    }
    listUsersForSuperadmin(req) {
        this.getSuperadminUser(req);
        return this.readUsersFile().users.map((user) => ({ ...user, passwordHash: user.passwordHash ? '[set]' : undefined }));
    }
    async requestSuperadminPasswordReset(req, email) {
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
    resetSuperadminPassword(token, password) {
        const cleanToken = this.cleanText(token, 256);
        const cleanPassword = password || '';
        if (!cleanToken || cleanPassword.length < 12) {
            throw new common_1.BadRequestException('Password reset token and a password of at least 12 characters are required.');
        }
        const tokensFile = this.readPasswordResetTokensFile();
        const now = new Date();
        const resetToken = tokensFile.tokens.find((item) => item.token === cleanToken && !item.usedAt && Date.parse(item.expiresAt) > now.getTime());
        if (!resetToken) {
            throw new common_1.UnauthorizedException('Password reset token is invalid or expired.');
        }
        const usersFile = this.readUsersFile();
        const user = usersFile.users.find((item) => item.id === resetToken.userId && item.email.toLowerCase() === this.superadminEmail && item.role === 'superadmin');
        if (!user) {
            throw new common_1.UnauthorizedException('Password reset token is invalid.');
        }
        user.passwordHash = this.hashPassword(cleanPassword);
        user.passwordUpdatedAt = now.toISOString();
        user.updatedAt = now.toISOString();
        resetToken.usedAt = now.toISOString();
        this.writeJson(this.usersFile, usersFile);
        this.writeJson(this.passwordResetTokensFile, tokensFile);
        return user;
    }
    async exchangeGoogleCode(req, code) {
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
        const tokens = (await response.json());
        if (!response.ok || tokens.error) {
            throw new common_1.UnauthorizedException(tokens.error_description || tokens.error || 'Google token exchange failed.');
        }
        return tokens;
    }
    async fetchGoogleUserInfo(accessToken) {
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = (await response.json());
        if (!response.ok || !userInfo.sub || !userInfo.email) {
            throw new common_1.UnauthorizedException('Google user profile request failed.');
        }
        return userInfo;
    }
    upsertGoogleUser(googleUser, mode) {
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
        const user = {
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
        this.findActiveSubscriptionByEmail(googleUser.email).then((sub) => {
            if (!sub)
                return;
            const file = this.readUsersFile();
            const dbUser = file.users.find((u) => u.id === user.id);
            if (!dbUser)
                return;
            dbUser.paddleSubscriptionId = sub.id;
            dbUser.paddleSubscriptionStatus = sub.status;
            dbUser.paddleSubscribedAt = sub.createdAt;
            dbUser.paddleSubscriptionUpdatedAt = new Date().toISOString();
            this.writeJson(this.usersFile, file);
        }).catch(() => { });
        this.writeJson(this.usersFile, usersFile);
        return user;
    }
    createSession(userId) {
        const sessionsFile = this.readSessionsFile();
        const now = new Date();
        const session = {
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
    saveOAuthState(state, mode) {
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
    consumeOAuthState(state) {
        const statesFile = this.readOAuthStatesFile();
        const currentTime = Date.now();
        const pendingState = statesFile.states.find((item) => item.state === state && Date.parse(item.expiresAt) > currentTime) ?? null;
        statesFile.states = statesFile.states.filter((item) => item.state !== state && Date.parse(item.expiresAt) > currentTime);
        this.writeJson(this.oauthStatesFile, statesFile);
        return pendingState;
    }
    parseStateMode(state) {
        if (state.startsWith('login.')) {
            return 'login';
        }
        if (state.startsWith('register.')) {
            return 'register';
        }
        throw new common_1.BadRequestException('Invalid OAuth state mode.');
    }
    getGoogleWebRedirectUri(req) {
        const override = process.env.GOOGLE_REDIRECT_URI;
        if (override) {
            return override;
        }
        const host = req.hostname?.toLowerCase().split(':')[0];
        const origin = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
        return `${origin}/auth/google/callback`;
    }
    getFirstName(fullName, email) {
        const trimmedName = fullName?.trim();
        if (!trimmedName) {
            return email.split('@')[0];
        }
        return trimmedName.split(/\s+/)[0] || trimmedName;
    }
    getLastName(fullName) {
        const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
        return parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
    cleanText(value, maxLength) {
        return (value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
    }
    cleanWebsite(value) {
        const website = this.cleanText(value, 240);
        if (!website) {
            return '';
        }
        if (/^https?:\/\//i.test(website)) {
            return website;
        }
        return `https://${website}`;
    }
    getGoogleOAuthConfig() {
        const envClientId = process.env.GOOGLE_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (envClientId && envClientSecret) {
            return { clientId: envClientId, clientSecret: envClientSecret };
        }
        const configPath = (0, path_1.join)(process.cwd(), 'google-oauth.json');
        if (!(0, fs_1.existsSync)(configPath)) {
            throw new common_1.InternalServerErrorException('google-oauth.json was not found and GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.');
        }
        const rawConfig = JSON.parse((0, fs_1.readFileSync)(configPath, 'utf-8'));
        const configBlock = (rawConfig.web || rawConfig.installed || rawConfig);
        const clientId = typeof configBlock.client_id === 'string' ? configBlock.client_id : undefined;
        const clientSecret = typeof configBlock.client_secret === 'string' ? configBlock.client_secret : undefined;
        if (!clientId || !clientSecret) {
            throw new common_1.InternalServerErrorException('Google OAuth config must contain client_id and client_secret.');
        }
        return { clientId, clientSecret };
    }
    readUsersFile() {
        return this.readJson(this.usersFile, { users: [] });
    }
    readSessionsFile() {
        return this.readJson(this.sessionsFile, { sessions: [] });
    }
    readOAuthStatesFile() {
        return this.readJson(this.oauthStatesFile, { states: [] });
    }
    readPasswordResetTokensFile() {
        return this.readJson(this.passwordResetTokensFile, { tokens: [] });
    }
    readJson(filePath, fallback) {
        this.ensureDataDir();
        if (!(0, fs_1.existsSync)(filePath)) {
            this.writeJson(filePath, fallback);
            return fallback;
        }
        return JSON.parse((0, fs_1.readFileSync)(filePath, 'utf-8'));
    }
    writeJson(filePath, value) {
        this.ensureDataDir();
        (0, fs_1.writeFileSync)(filePath, `${JSON.stringify(value, null, 2)}\n`);
    }
    ensureDataDir() {
        if (!(0, fs_1.existsSync)(this.dataDir)) {
            (0, fs_1.mkdirSync)(this.dataDir, { recursive: true });
        }
    }
    readCookie(req, name) {
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
    isSecureRequest(req) {
        return req.secure || req.headers['x-forwarded-proto'] === 'https';
    }
    getRequestOrigin(req) {
        const protocol = this.isSecureRequest(req) ? 'https' : 'http';
        return `${protocol}://${req.get('host') || 'localhost:3000'}`;
    }
    hashPassword(password) {
        const salt = (0, crypto_1.randomBytes)(16);
        const hash = (0, crypto_1.scryptSync)(password, salt, 64);
        return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
    }
    verifyPassword(password, storedHash) {
        const [algorithm, saltValue, hashValue] = storedHash.split('$');
        if (algorithm !== 'scrypt' || !saltValue || !hashValue) {
            return false;
        }
        const salt = Buffer.from(saltValue, 'base64url');
        const expectedHash = Buffer.from(hashValue, 'base64url');
        const actualHash = (0, crypto_1.scryptSync)(password, salt, expectedHash.length);
        return expectedHash.length === actualHash.length && (0, crypto_1.timingSafeEqual)(expectedHash, actualHash);
    }
    async sendPasswordResetEmail(email, resetUrl) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || user;
        if (!host || !user || !pass || !from) {
            return false;
        }
        const transporter = nodemailer_1.default.createTransport({
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
    randomToken(bytes) {
        return (0, crypto_1.randomBytes)(bytes).toString('base64url');
    }
    getPaddleConfig() {
        const envKey = process.env.PADDLE_API_KEY;
        const envEnv = process.env.PADDLE_ENV;
        if (envKey)
            return { apiKey: envKey, environment: envEnv ?? 'production' };
        if (!(0, fs_1.existsSync)(this.paddleConfigFile))
            throw new common_1.InternalServerErrorException('Paddle is not configured.');
        return JSON.parse((0, fs_1.readFileSync)(this.paddleConfigFile, 'utf-8'));
    }
    getPaddleApiUrl() {
        const { environment } = this.getPaddleConfig();
        return environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
    }
    async paddleGet(path) {
        const { apiKey } = this.getPaddleConfig();
        const res = await fetch(`${this.getPaddleApiUrl()}${path}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        const json = (await res.json());
        if (!res.ok)
            throw new common_1.BadRequestException(json.error?.detail ?? 'Paddle API error.');
        return (json.data ?? json);
    }
    async paddlePost(path, body) {
        const { apiKey } = this.getPaddleConfig();
        const res = await fetch(`${this.getPaddleApiUrl()}${path}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = (await res.json());
        if (!res.ok)
            throw new common_1.BadRequestException(json.error?.detail ?? 'Paddle API error.');
        return (json.data ?? json);
    }
    async verifyCheckoutAndSave(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        const sub = await this.findActiveSubscriptionByEmail(currentUser.email);
        if (!sub)
            throw new common_1.BadRequestException('No active subscription found. Please wait a moment and try again.');
        const usersFile = this.readUsersFile();
        const dbUser = usersFile.users.find((u) => u.id === currentUser.id);
        if (!dbUser)
            throw new common_1.UnauthorizedException('User not found.');
        const now = new Date().toISOString();
        dbUser.paddleSubscriptionId = sub.id;
        dbUser.paddleSubscriptionStatus = sub.status;
        dbUser.paddleSubscribedAt = dbUser.paddleSubscribedAt ?? now;
        dbUser.paddleSubscriptionUpdatedAt = now;
        this.writeJson(this.usersFile, usersFile);
        return dbUser;
    }
    async cancelUserSubscription(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        if (!currentUser.paddleSubscriptionId)
            throw new common_1.BadRequestException('No active subscription found.');
        await this.paddlePost(`/subscriptions/${currentUser.paddleSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });
        const usersFile = this.readUsersFile();
        const dbUser = usersFile.users.find((u) => u.id === currentUser.id);
        if (dbUser) {
            dbUser.paddleSubscriptionStatus = 'canceled';
            dbUser.paddleSubscriptionUpdatedAt = new Date().toISOString();
            this.writeJson(this.usersFile, usersFile);
        }
    }
    async cancelSubscriptionById(subscriptionId) {
        try {
            await this.paddlePost(`/subscriptions/${subscriptionId}/cancel`, { effective_from: 'next_billing_period' });
        }
        catch {
        }
    }
    async findActiveSubscriptionByEmail(email) {
        try {
            const customers = (await this.paddleGet(`/customers?search=${encodeURIComponent(email)}`));
            const list = Array.isArray(customers) ? customers : customers.items ?? [];
            const customer = list.find((c) => c.email?.toLowerCase() === email.toLowerCase());
            if (!customer)
                return null;
            const subs = (await this.paddleGet(`/subscriptions?customer_id=${customer.id}`));
            const subList = Array.isArray(subs) ? subs : subs.items ?? [];
            const active = subList.find((s) => s.status === 'active' || s.status === 'trialing');
            if (!active)
                return null;
            return { id: active.id, status: active.status, createdAt: active.created_at };
        }
        catch {
            return null;
        }
    }
    getQueryValue(value) {
        if (Array.isArray(value)) {
            return typeof value[0] === 'string' ? value[0] : undefined;
        }
        return typeof value === 'string' ? value : undefined;
    }
    handlePaddleWebhook(body) {
        const eventType = body.event_type;
        if (!eventType)
            return;
        const data = body.data;
        if (!data)
            return;
        const statusMap = {
            active: 'active',
            trialing: 'trialing',
            canceled: 'canceled',
            paused: 'paused',
            past_due: 'past_due',
        };
        if (['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.paused', 'subscription.resumed'].includes(eventType)) {
            const subscriptionId = data.id;
            const status = statusMap[data.status] ?? 'active';
            const customer = data.customer;
            const email = customer?.email;
            if (!email || !subscriptionId)
                return;
            const usersFile = this.readUsersFile();
            const user = usersFile.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
            if (!user)
                return;
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
