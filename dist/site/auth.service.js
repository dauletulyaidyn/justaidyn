"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
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
const prisma_service_1 = require("../prisma.service");
let AuthService = class AuthService {
    constructor(prisma) {
        this.prisma = prisma;
        this.superadminEmail = 'aidyn.daulet@gmail.com';
        this.oauthStateCookie = 'ja_oauth_state';
        this.sessionCookie = 'ja_session';
        this.paddleConfigFile = (0, path_1.join)(process.cwd(), 'paddle-config.json');
        this.sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
        this.apiTokenTtlMs = 90 * 24 * 60 * 60 * 1000;
        this.desktopChallengeCookie = 'ja_desktop_challenge';
    }
    mapUser(u) {
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
            paddleSubscriptionStatus: u.paddleSubscriptionStatus ?? undefined,
            paddleSubscribedAt: u.paddleSubscribedAt?.toISOString(),
            paddleSubscriptionUpdatedAt: u.paddleSubscriptionUpdatedAt?.toISOString(),
            thinkerSubscriptionId: u.thinkerSubscriptionId ?? undefined,
            thinkerSubscriptionStatus: u.thinkerSubscriptionStatus ?? undefined,
            thinkerSubscribedAt: u.thinkerSubscribedAt?.toISOString(),
            thinkerSubscriptionUpdatedAt: u.thinkerSubscriptionUpdatedAt?.toISOString(),
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            lastLoginAt: u.lastLoginAt.toISOString(),
        };
    }
    async resolveCurrentUser(req) {
        const sessionId = this.readCookie(req, this.sessionCookie);
        if (!sessionId)
            return null;
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        return session ? this.mapUser(session.user) : null;
    }
    getCurrentUser(req) {
        return req._currentUser ?? null;
    }
    async buildGoogleWebAuthUrl(req, mode) {
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
    setOAuthStateCookie(res, authUrl, req) {
        const state = new URL(authUrl).searchParams.get('state');
        if (!state)
            throw new common_1.InternalServerErrorException('OAuth state was not generated.');
        res.cookie(this.oauthStateCookie, state, {
            httpOnly: true, sameSite: 'lax',
            secure: this.isSecureRequest(req),
            maxAge: 10 * 60 * 1000, path: '/',
        });
    }
    async handleGoogleCallback(req, res) {
        const code = this.getQueryValue(req.query.code);
        const state = this.getQueryValue(req.query.state);
        const error = this.getQueryValue(req.query.error);
        if (error)
            throw new common_1.BadRequestException(`Google OAuth failed: ${error}`);
        if (!state)
            throw new common_1.BadRequestException('Google OAuth callback requires state.');
        const pendingState = await this.consumeOAuthState(state);
        const expectedState = this.readCookie(req, this.oauthStateCookie);
        if (!pendingState && (!expectedState || expectedState !== state)) {
            throw new common_1.UnauthorizedException('Invalid OAuth state.');
        }
        if (!code)
            throw new common_1.BadRequestException('Google OAuth callback requires code.');
        const mode = pendingState?.mode ?? this.parseStateMode(state);
        const tokens = await this.exchangeGoogleCode(req, code);
        if (!tokens.access_token)
            throw new common_1.UnauthorizedException('Google did not return an access token.');
        const googleUser = await this.fetchGoogleUserInfo(tokens.access_token);
        if (!googleUser.email || googleUser.email_verified === false) {
            throw new common_1.UnauthorizedException('Google account email is not verified.');
        }
        const user = await this.upsertGoogleUser(googleUser, mode);
        const session = await this.createSession(user.id);
        res.clearCookie(this.oauthStateCookie, { path: '/' });
        res.cookie(this.sessionCookie, session.id, {
            httpOnly: true, sameSite: 'lax',
            secure: this.isSecureRequest(req),
            maxAge: this.sessionTtlMs, path: '/',
        });
        return { user, desktopRedirectUri: pendingState?.desktopRedirectUri };
    }
    async logout(req, res) {
        const sessionId = this.readCookie(req, this.sessionCookie);
        if (sessionId)
            await this.prisma.session.deleteMany({ where: { id: sessionId } });
        res.clearCookie(this.sessionCookie, { path: '/' });
    }
    async updateCurrentUserProfile(req, input) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
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
        const name = [updated.firstName, updated.lastName].filter(Boolean).join(' ') || updated.email;
        if (name !== updated.name) {
            await this.prisma.user.update({ where: { id: updated.id }, data: { name } });
            updated.name = name;
        }
        return this.mapUser(updated);
    }
    async deleteCurrentUser(req, res) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        if (currentUser.email.toLowerCase() === this.superadminEmail) {
            throw new common_1.ForbiddenException('The superadmin account cannot be deleted.');
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
    async loginSuperadmin(req, res, email, password) {
        const normalizedEmail = this.cleanText(email, 240).toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' }, role: 'SUPERADMIN' },
        });
        if (normalizedEmail !== this.superadminEmail || !user?.passwordHash || !password || !this.verifyPassword(password, user.passwordHash)) {
            throw new common_1.UnauthorizedException('Invalid superadmin credentials.');
        }
        const session = await this.createSession(user.id);
        res.cookie(this.sessionCookie, session.id, {
            httpOnly: true, sameSite: 'lax',
            secure: this.isSecureRequest(req),
            maxAge: this.sessionTtlMs, path: '/',
        });
        return this.mapUser(user);
    }
    getSuperadminUser(req) {
        const user = this.getCurrentUser(req);
        if (!user || user.role !== 'superadmin')
            throw new common_1.UnauthorizedException('Superadmin access is required.');
        return user;
    }
    async listUsersForSuperadmin(req) {
        this.getSuperadminUser(req);
        const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        return users.map((u) => {
            const mapped = this.mapUser(u);
            const { passwordHash: _, ...rest } = mapped;
            return rest;
        });
    }
    async setSuperadminPassword(password) {
        const clean = password?.trim();
        if (!clean || clean.length < 12)
            throw new common_1.BadRequestException('Password must be at least 12 characters.');
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
    async requestSuperadminPasswordReset(req, email) {
        const normalizedEmail = this.cleanText(email, 240).toLowerCase();
        if (normalizedEmail !== this.superadminEmail)
            return {};
        const user = await this.prisma.user.findFirst({ where: { email: { equals: normalizedEmail, mode: 'insensitive' }, role: 'SUPERADMIN' } });
        if (!user)
            return {};
        const token = this.randomToken(48);
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await this.prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
        const resetUrl = `${this.getRequestOrigin(req)}/admin/password-reset/${token}`;
        const emailSent = await this.sendPasswordResetEmail(user.email, resetUrl);
        return emailSent ? {} : { resetUrl };
    }
    async verifySuperadminPasswordResetToken(req, token) {
        if (!token)
            return false;
        const record = await this.prisma.passwordResetToken.findFirst({
            where: { token, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        return !!(record && record.user.email.toLowerCase() === this.superadminEmail);
    }
    async resetSuperadminPassword(token, password) {
        const cleanToken = this.cleanText(token, 256);
        const cleanPassword = password || '';
        if (!cleanToken || cleanPassword.length < 12) {
            throw new common_1.BadRequestException('Password reset token and a password of at least 12 characters are required.');
        }
        const record = await this.prisma.passwordResetToken.findFirst({
            where: { token: cleanToken, expiresAt: { gt: new Date() } },
            include: { user: true },
        });
        if (!record || record.user.email.toLowerCase() !== this.superadminEmail || record.user.role !== 'SUPERADMIN') {
            throw new common_1.UnauthorizedException('Password reset token is invalid or expired.');
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
    async verifyCheckoutAndSave(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        const sub = await this.findActiveSubscriptionByEmail(currentUser.email, 'pro_01kq54k4zhcg6hfa0k8rpvf708');
        if (!sub)
            throw new common_1.BadRequestException('No active ScreenCam subscription found. Please wait a moment and try again.');
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
    async cancelUserSubscription(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        if (!currentUser.paddleSubscriptionId)
            throw new common_1.BadRequestException('No active subscription found.');
        await this.paddlePost(`/subscriptions/${currentUser.paddleSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });
        await this.prisma.user.update({
            where: { id: currentUser.id },
            data: { paddleSubscriptionStatus: 'canceled', paddleSubscriptionUpdatedAt: new Date() },
        });
    }
    async verifyThinkerCheckoutAndSave(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        const sub = await this.findActiveSubscriptionByEmail(currentUser.email, 'pro_01kq8twcm18210x96b7k9fnrbq');
        if (!sub)
            throw new common_1.BadRequestException('No active Thinker subscription found. Please wait a moment and try again.');
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
    async cancelThinkerSubscription(req) {
        const currentUser = this.getCurrentUser(req);
        if (!currentUser)
            throw new common_1.UnauthorizedException('Login is required.');
        if (!currentUser.thinkerSubscriptionId)
            throw new common_1.BadRequestException('No active Thinker subscription found.');
        await this.paddlePost(`/subscriptions/${currentUser.thinkerSubscriptionId}/cancel`, { effective_from: 'next_billing_period' });
        await this.prisma.user.update({
            where: { id: currentUser.id },
            data: { thinkerSubscriptionStatus: 'canceled', thinkerSubscriptionUpdatedAt: new Date() },
        });
    }
    verifyPaddleWebhookSignature(signatureHeader, rawBody) {
        const secret = this.getPaddleWebhookSecret();
        if (!secret)
            throw new common_1.InternalServerErrorException('Paddle webhook secret is not configured.');
        if (!signatureHeader || !rawBody)
            throw new common_1.UnauthorizedException('Missing Paddle webhook signature.');
        const parts = signatureHeader.split(';').map((part) => part.trim()).filter(Boolean);
        const timestamp = parts.find((part) => part.startsWith('ts='))?.slice(3);
        const signatures = parts.filter((part) => part.startsWith('h1=')).map((part) => part.slice(3));
        if (!timestamp || !signatures.length || !/^\d+$/.test(timestamp)) {
            throw new common_1.UnauthorizedException('Invalid Paddle webhook signature header.');
        }
        const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
        if (ageMs > 5 * 60 * 1000) {
            throw new common_1.UnauthorizedException('Paddle webhook signature timestamp is outside tolerance.');
        }
        const signedPayload = Buffer.concat([
            Buffer.from(`${timestamp}:`, 'utf-8'),
            rawBody,
        ]);
        const expected = (0, crypto_1.createHmac)('sha256', secret).update(signedPayload).digest('hex');
        const expectedBuffer = Buffer.from(expected, 'hex');
        const ok = signatures.some((signature) => {
            if (!/^[a-f0-9]{64}$/i.test(signature))
                return false;
            const actualBuffer = Buffer.from(signature, 'hex');
            return actualBuffer.length === expectedBuffer.length && (0, crypto_1.timingSafeEqual)(actualBuffer, expectedBuffer);
        });
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid Paddle webhook signature.');
    }
    async handlePaddleWebhook(body) {
        const eventType = body.event_type;
        if (!eventType)
            return;
        const data = body.data;
        if (!data)
            return;
        const subEvents = ['subscription.created', 'subscription.updated', 'subscription.canceled', 'subscription.paused', 'subscription.resumed'];
        if (!subEvents.includes(eventType))
            return;
        const subscriptionId = data.id;
        const status = data.status;
        const customer = data.customer;
        const email = customer?.email;
        if (!email || !subscriptionId)
            return;
        const items = data.items ?? [];
        const priceId = items[0]?.price?.id;
        const productId = items[0]?.price?.product_id;
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user)
            return;
        const isThinker = productId === 'pro_01kq8twcm18210x96b7k9fnrbq';
        const now = new Date();
        if (isThinker) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { thinkerSubscriptionId: subscriptionId, thinkerSubscriptionStatus: status, thinkerSubscriptionUpdatedAt: now, ...(eventType === 'subscription.created' && { thinkerSubscribedAt: now }) },
            });
        }
        else {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { paddleSubscriptionId: subscriptionId, paddleSubscriptionStatus: status, paddleSubscriptionUpdatedAt: now, ...(eventType === 'subscription.created' && { paddleSubscribedAt: now }) },
            });
        }
    }
    async createSession(userId) {
        const id = this.randomToken(48);
        const expiresAt = new Date(Date.now() + this.sessionTtlMs);
        await this.prisma.session.create({ data: { id, userId, expiresAt } });
        return { id };
    }
    async saveOAuthState(state, mode, desktopRedirectUri) {
        await this.prisma.oAuthState.create({ data: { state, mode, desktopRedirectUri } });
        await this.prisma.oAuthState.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } } });
    }
    async consumeOAuthState(state) {
        const record = await this.prisma.oAuthState.findUnique({ where: { state } });
        if (!record || record.createdAt < new Date(Date.now() - 15 * 60 * 1000))
            return null;
        await this.prisma.oAuthState.delete({ where: { state } }).catch(() => { });
        return { mode: record.mode, desktopRedirectUri: record.desktopRedirectUri ?? undefined };
    }
    async upsertGoogleUser(googleUser, _mode) {
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
                    ...(isSuperadmin && { role: 'SUPERADMIN' }),
                },
            });
            const name = [updated.firstName, updated.lastName].filter(Boolean).join(' ') || googleUser.name || googleUser.email;
            if (name !== updated.name)
                await this.prisma.user.update({ where: { id: updated.id }, data: { name } });
            updated.name = name;
            return this.mapUser(updated);
        }
        const firstName = googleUser.given_name || this.getFirstName(googleUser.name, googleUser.email);
        const lastName = googleUser.family_name || this.getLastName(googleUser.name);
        const name = [firstName, lastName].filter(Boolean).join(' ') || googleUser.name || googleUser.email;
        const created = await this.prisma.user.create({
            data: {
                googleSub: googleUser.sub, email: googleUser.email, name, firstName, lastName,
                picture: googleUser.picture,
                role: isSuperadmin ? 'SUPERADMIN' : 'CLIENT',
                lastLoginAt: now,
            },
        });
        this.relinkPaddleSubscriptions(created.id, googleUser.email).catch(() => { });
        return this.mapUser(created);
    }
    async relinkPaddleSubscriptions(userId, email) {
        const [screencam, thinker] = await Promise.all([
            this.findActiveSubscriptionByEmail(email, 'pro_01kq54k4zhcg6hfa0k8rpvf708'),
            this.findActiveSubscriptionByEmail(email, 'pro_01kq8twcm18210x96b7k9fnrbq'),
        ]);
        const data = {};
        if (screencam) {
            data.paddleSubscriptionId = screencam.id;
            data.paddleSubscriptionStatus = screencam.status;
            data.paddleSubscribedAt = new Date(screencam.createdAt);
            data.paddleSubscriptionUpdatedAt = new Date();
        }
        if (thinker) {
            data.thinkerSubscriptionId = thinker.id;
            data.thinkerSubscriptionStatus = thinker.status;
            data.thinkerSubscribedAt = new Date(thinker.createdAt);
            data.thinkerSubscriptionUpdatedAt = new Date();
        }
        if (Object.keys(data).length)
            await this.prisma.user.update({ where: { id: userId }, data: data });
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
    getPaddleWebhookSecret() {
        const envSecret = process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_WEBHOOK_SECRET_KEY;
        if (envSecret)
            return envSecret;
        if (!(0, fs_1.existsSync)(this.paddleConfigFile))
            return '';
        const config = JSON.parse((0, fs_1.readFileSync)(this.paddleConfigFile, 'utf-8'));
        return String(config.webhookSecret || config.webhookSecretKey || config.endpointSecretKey || '');
    }
    getPaddleApiUrl() {
        return this.getPaddleConfig().environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
    }
    async paddleGet(path) {
        const { apiKey } = this.getPaddleConfig();
        const res = await fetch(`${this.getPaddleApiUrl()}${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
        const json = (await res.json());
        if (!res.ok)
            throw new common_1.BadRequestException(json.error?.detail ?? 'Paddle API error.');
        return json.data ?? json;
    }
    async paddlePost(path, body) {
        const { apiKey } = this.getPaddleConfig();
        const res = await fetch(`${this.getPaddleApiUrl()}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const json = (await res.json());
        if (!res.ok)
            throw new common_1.BadRequestException(json.error?.detail ?? 'Paddle API error.');
        return json.data ?? json;
    }
    async cancelSubscriptionById(subscriptionId) {
        try {
            await this.paddlePost(`/subscriptions/${subscriptionId}/cancel`, { effective_from: 'next_billing_period' });
        }
        catch { }
    }
    async findActiveSubscriptionByEmail(email, productId) {
        try {
            const customers = (await this.paddleGet(`/customers?search=${encodeURIComponent(email)}`));
            const list = Array.isArray(customers) ? customers : [];
            const customer = list.find((c) => c.email?.toLowerCase() === email.toLowerCase());
            if (!customer)
                return null;
            const subs = (await this.paddleGet(`/subscriptions?customer_id=${customer.id}`));
            const subList = Array.isArray(subs) ? subs : [];
            const active = subList.find((s) => {
                const isActive = s.status === 'active' || s.status === 'trialing';
                if (!isActive)
                    return false;
                if (!productId)
                    return true;
                const items = s.items ?? [];
                const pId = items[0]?.price?.product_id;
                return pId === productId;
            });
            if (!active)
                return null;
            return { id: active.id, status: active.status, createdAt: active.created_at };
        }
        catch {
            return null;
        }
    }
    async exchangeGoogleCode(req, code) {
        const config = this.getGoogleOAuthConfig();
        const body = new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: this.getGoogleWebRedirectUri(req), grant_type: 'authorization_code' });
        const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const tokens = (await response.json());
        if (!response.ok || tokens.error)
            throw new common_1.UnauthorizedException(tokens.error_description || tokens.error || 'Google token exchange failed.');
        return tokens;
    }
    async fetchGoogleUserInfo(accessToken) {
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
        const userInfo = (await response.json());
        if (!response.ok || !userInfo.sub || !userInfo.email)
            throw new common_1.UnauthorizedException('Google user profile request failed.');
        return userInfo;
    }
    parseStateMode(state) {
        if (state.startsWith('login.'))
            return 'login';
        if (state.startsWith('register.'))
            return 'register';
        throw new common_1.BadRequestException('Invalid OAuth state mode.');
    }
    getGoogleWebRedirectUri(req) {
        const override = process.env.GOOGLE_REDIRECT_URI;
        if (override)
            return override;
        const host = req.hostname?.toLowerCase().split(':')[0];
        const origin = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
        return `${origin}/auth/google/callback`;
    }
    getRequestOrigin(req) {
        const host = req.hostname?.toLowerCase().split(':')[0];
        return host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
    }
    getGoogleOAuthConfig() {
        const envClientId = process.env.GOOGLE_CLIENT_ID;
        const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
        if (envClientId && envClientSecret)
            return { clientId: envClientId, clientSecret: envClientSecret };
        const configPath = (0, path_1.join)(process.cwd(), 'google-oauth.json');
        if (!(0, fs_1.existsSync)(configPath))
            throw new common_1.InternalServerErrorException('google-oauth.json was not found and GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set.');
        const rawConfig = JSON.parse((0, fs_1.readFileSync)(configPath, 'utf-8'));
        const configBlock = (rawConfig.web || rawConfig.installed || rawConfig);
        const clientId = typeof configBlock.client_id === 'string' ? configBlock.client_id : undefined;
        const clientSecret = typeof configBlock.client_secret === 'string' ? configBlock.client_secret : undefined;
        if (!clientId || !clientSecret)
            throw new common_1.InternalServerErrorException('Google OAuth config must contain client_id and client_secret.');
        return { clientId, clientSecret };
    }
    isSecureRequest(req) {
        return req.secure || req.headers['x-forwarded-proto'] === 'https';
    }
    readCookie(req, name) {
        const cookies = req.headers.cookie ?? '';
        const match = cookies.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
    }
    getFirstName(fullName, email) {
        const trimmed = fullName?.trim();
        if (!trimmed)
            return email.split('@')[0];
        return trimmed.split(/\s+/)[0] || trimmed;
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
        if (!website)
            return '';
        return /^https?:\/\//i.test(website) ? website : `https://${website}`;
    }
    hashPassword(password) {
        const salt = (0, crypto_1.randomBytes)(16);
        const hash = (0, crypto_1.scryptSync)(password, salt, 64);
        return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
    }
    verifyPassword(password, storedHash) {
        const [algorithm, saltValue, hashValue] = storedHash.split('$');
        if (algorithm !== 'scrypt' || !saltValue || !hashValue)
            return false;
        try {
            const salt = Buffer.from(saltValue, 'hex');
            const expectedHash = Buffer.from(hashValue, 'hex');
            const actualHash = (0, crypto_1.scryptSync)(password, salt, expectedHash.length);
            return expectedHash.length === actualHash.length && (0, crypto_1.timingSafeEqual)(expectedHash, actualHash);
        }
        catch {
            return false;
        }
    }
    randomToken(bytes) {
        return (0, crypto_1.randomBytes)(bytes).toString('base64url');
    }
    async buildGoogleWebAuthUrlForDesktop(req, res, mode, desktopRedirectUri, codeChallenge) {
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
    readDesktopChallengeCookie(req, res) {
        const challenge = this.readCookie(req, this.desktopChallengeCookie);
        if (challenge)
            res.clearCookie(this.desktopChallengeCookie, { path: '/' });
        return challenge || undefined;
    }
    async createDesktopOtc(userId, redirectUri, codeChallenge) {
        const token = this.randomToken(32);
        const expiresAt = new Date(Date.now() + 60 * 1000);
        await this.prisma.desktopOtc.create({ data: { token, userId, redirectUri, codeChallenge, expiresAt } });
        await this.prisma.desktopOtc.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } } });
        return token;
    }
    async exchangeDesktopOtc(otcToken, codeVerifier) {
        const record = await this.prisma.desktopOtc.findUnique({ where: { token: otcToken } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired one-time code.');
        }
        const expected = (0, crypto_1.createHash)('sha256').update(codeVerifier).digest('base64url');
        if (expected !== record.codeChallenge) {
            throw new common_1.UnauthorizedException('PKCE verification failed.');
        }
        await this.prisma.desktopOtc.update({ where: { id: record.id }, data: { usedAt: new Date() } });
        const accessToken = this.randomToken(48);
        const expiresAt = new Date(Date.now() + this.apiTokenTtlMs);
        await this.prisma.apiToken.create({ data: { token: accessToken, userId: record.userId, expiresAt } });
        const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
        if (!user)
            throw new common_1.UnauthorizedException('User not found.');
        return { accessToken, user: this.mapUser(user) };
    }
    async verifyBearerToken(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            return null;
        const token = authHeader.slice(7);
        if (!token)
            return null;
        const record = await this.prisma.apiToken.findUnique({ where: { token }, include: { user: true } });
        if (!record || record.expiresAt < new Date())
            return null;
        this.prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => { });
        return this.mapUser(record.user);
    }
    getQueryValue(value) {
        if (Array.isArray(value))
            return typeof value[0] === 'string' ? value[0] : undefined;
        return typeof value === 'string' ? value : undefined;
    }
    async sendPasswordResetEmail(email, resetUrl) {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT || 587);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.SMTP_FROM || user;
        if (!host || !user || !pass || !from)
            return false;
        try {
            const transporter = nodemailer_1.default.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
            await transporter.sendMail({ from, to: email, subject: 'JustAidyn superadmin password reset', text: `Use this link to reset the JustAidyn superadmin password. The link expires in 30 minutes.\n\n${resetUrl}` });
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
