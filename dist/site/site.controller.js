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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const fs_1 = require("fs");
const path_1 = require("path");
const auth_service_1 = require("./auth.service");
const analytics_service_1 = require("./analytics.service");
const site_service_1 = require("./site.service");
const post_service_1 = require("./post.service");
const app_catalog_service_1 = require("./app-catalog.service");
const { diskStorage } = require('multer');
const installerUpload = {
    storage: diskStorage({
        destination: (_req, _file, cb) => {
            const dir = (0, path_1.join)(process.cwd(), 'tmp', 'uploads');
            (0, fs_1.mkdirSync)(dir, { recursive: true });
            cb(null, dir);
        },
    }),
    limits: { fileSize: 1024 * 1024 * 1024 },
};
let SiteController = class SiteController {
    constructor(siteService, authService, postService, analyticsService, appCatalogService) {
        this.siteService = siteService;
        this.authService = authService;
        this.postService = postService;
        this.analyticsService = analyticsService;
        this.appCatalogService = appCatalogService;
    }
    async root(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site === 'main') {
            return res.render('pages/home', this.withSharedModel(this.siteService.getHomePage(), req));
        }
        if (site === 'courses') {
            return res.render('pages/course-wrapper', this.withSharedModel(this.siteService.getCoursePageModel('JustAidyn Courses | AI Agents Course', 'course-home'), req));
        }
        if (site === 'skillsminds') {
            const posts = await this.postService.listPublished('skillsminds');
            return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('skillsminds', posts), req));
        }
        if (site === 'nofacethinker') {
            const user = this.authService.getCurrentUser(req);
            const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
            const posts = await this.postService.listPublished('nofacethinker');
            if (!isSubscribed) {
                return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getThinkerPreviewListPage(posts), req));
            }
            return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('nofacethinker', posts), req));
        }
        if (site === 'apps') {
            return res.render('pages/apps-landing', this.withSharedModel(this.getAppsLandingPage(), req));
        }
        if (site === 'shop') {
            return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'shop', 'index.html'));
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage(site), req));
    }
    projects(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/projects');
        }
        return this.withSharedModel(this.siteService.getProjectsPage(), req);
    }
    login(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/login');
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getLoginPage(), req));
    }
    adminLogin(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getAdminLoginPage(), req);
    }
    async adminLoginPost(req, res, body) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        await this.authService.loginSuperadmin(req, res, body.email, body.password);
        return res.redirect('/admin');
    }
    adminPasswordReset(req) {
        return this.withSharedModel(this.siteService.getAdminPasswordResetRequestPage(), req);
    }
    async adminPasswordResetPost(req, body) {
        const result = await this.authService.requestSuperadminPasswordReset(req, body.email);
        return this.withSharedModel(this.siteService.getAdminPasswordResetRequestPage(result.resetUrl), req);
    }
    adminPasswordResetSet(req, token) {
        return this.withSharedModel(this.siteService.getAdminPasswordResetSetPage(token), req);
    }
    async adminPasswordResetSetPost(req, res, token, body) {
        await this.authService.resetSuperadminPassword(token, body.password);
        return res.redirect('/admin/login');
    }
    adminDashboard(req, res) {
        if (!this.tryRequireSuperadmin(req, res)) {
            return;
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminDashboardPage(), req));
    }
    async adminUsers(req, res) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const users = await this.authService.listUsersForSuperadmin(req);
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminUsersPage(users), req));
    }
    async adminPosts(req, res) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const posts = await this.postService.listAll();
        return res.render('pages/admin-posts', this.withSharedModel(this.siteService.getAdminPostsPage(posts), req));
    }
    async adminAnalytics(req, res) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const analytics = await this.analyticsService.getDashboard();
        const page = {
            ...this.siteService.getAdminSectionPage('Posts'),
            title: 'Analytics | Admin | JustAidyn',
            pageKey: 'admin-analytics',
            heroTitle: 'Analytics',
            heroText: 'Post views, reading time, and unique visitor analytics.',
        };
        return res.render('pages/admin-analytics', { ...this.withSharedModel(page, req), analytics });
    }
    adminPostNew(req, res) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const platform = req.query.platform || 'skillsminds';
        return res.render('pages/admin-post-form', this.withSharedModel(this.siteService.getAdminPostFormPage(null, platform), req));
    }
    async adminPostCreate(req, res, body) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const platform = body.platform === 'nofacethinker' ? 'nofacethinker' : 'skillsminds';
        await this.postService.create({
            platform,
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt,
            content: body.content,
            coverImage: body.coverImage,
            published: body.published === 'on',
        });
        return res.redirect('/admin/posts');
    }
    async adminPostEdit(req, res, id) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const post = await this.postService.getById(id);
        return res.render('pages/admin-post-form', this.withSharedModel(this.siteService.getAdminPostFormPage(post, post.platform), req));
    }
    async adminPostUpdate(req, res, id, body) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        await this.postService.update(id, {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt,
            content: body.content,
            coverImage: body.coverImage,
            published: body.published === 'on',
        });
        return res.redirect('/admin/posts');
    }
    async adminPostDelete(req, res, id) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        await this.postService.delete(id);
        return res.redirect('/admin/posts');
    }
    adminApps(req, res) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const page = {
            ...this.siteService.getAdminSectionPage('Apps'),
            title: 'Apps | Admin | JustAidyn',
            pageKey: 'admin-apps',
            heroTitle: 'Apps',
            heroText: 'Create app pages and publish the latest installer.',
        };
        return res.render('pages/admin-apps', {
            ...this.withSharedModel(page, req),
            apps: this.appCatalogService.list(),
            editApp: null,
        });
    }
    adminAppEdit(req, res, slug) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const page = {
            ...this.siteService.getAdminSectionPage('Apps'),
            title: 'Edit App | Admin | JustAidyn',
            pageKey: 'admin-apps',
            heroTitle: 'Apps',
            heroText: 'Create app pages and publish the latest installer.',
        };
        return res.render('pages/admin-apps', {
            ...this.withSharedModel(page, req),
            apps: this.appCatalogService.list(),
            editApp: this.appCatalogService.get(slug),
        });
    }
    adminAppSave(req, res, body) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        const app = this.appCatalogService.save({
            slug: body.slug,
            name: body.name,
            shortDescription: body.shortDescription ?? '',
            description: body.description ?? '',
            version: body.version,
            releaseNotes: body.releaseNotes ?? '',
            published: body.published === 'on',
        });
        return res.redirect(`/admin/apps/${app.slug}/edit`);
    }
    adminAppUpload(req, res, slug, file) {
        if (!this.tryRequireSuperadmin(req, res))
            return;
        this.appCatalogService.attachInstaller(slug, file);
        return res.redirect(`/admin/apps/${slug}/edit`);
    }
    adminGames(req, res) {
        return this.renderAdminSection(req, res, 'Games');
    }
    adminCourses(req, res) {
        return this.renderAdminSection(req, res, 'Courses');
    }
    register(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/login');
        }
        return res.redirect('/login');
    }
    async loginGoogle(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/login/google');
        }
        const redirectUri = this.getQueryValue(req.query.redirect_uri);
        const codeChallenge = this.getQueryValue(req.query.code_challenge);
        if (redirectUri || codeChallenge) {
            if (!redirectUri || !codeChallenge) {
                throw new common_1.BadRequestException('Desktop OAuth requires both redirect_uri and code_challenge.');
            }
            const parsedUri = this.parseDesktopRedirectUri(redirectUri);
            if (!parsedUri) {
                throw new common_1.BadRequestException('redirect_uri must be http://127.0.0.1:<port>/oauth2callback or http://localhost:<port>/oauth2callback.');
            }
            if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeChallenge)) {
                throw new common_1.BadRequestException('code_challenge must be a valid PKCE S256 challenge.');
            }
            const authUrl = await this.authService.buildGoogleWebAuthUrlForDesktop(req, res, 'login', parsedUri.toString(), codeChallenge);
            this.authService.setOAuthStateCookie(res, authUrl, req);
            return res.redirect(authUrl);
        }
        const returnUrl = this.safeLocalReturnPath(typeof req.query.return === 'string' ? req.query.return : '');
        if (returnUrl) {
            res.cookie('ja_return_url', returnUrl, {
                httpOnly: true, sameSite: 'lax',
                secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
                maxAge: 10 * 60 * 1000,
            });
        }
        const authUrl = await this.authService.buildGoogleWebAuthUrl(req, 'login');
        this.authService.setOAuthStateCookie(res, authUrl, req);
        return res.redirect(authUrl);
    }
    profile(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/profile');
        }
        const user = this.authService.getCurrentUser(req);
        if (!user) {
            return res.redirect('/login');
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getProfilePage(user), req));
    }
    profileEdit(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/profile/edit');
        }
        const user = this.authService.getCurrentUser(req);
        if (!user) {
            return res.redirect('/login');
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getProfileEditPage(user), req));
    }
    async profileUpdate(req, res, body) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        await this.authService.updateCurrentUserProfile(req, {
            firstName: body.firstName,
            lastName: body.lastName,
            profileTitle: body.profileTitle,
            profileLabel: body.profileLabel,
            shortBio: body.shortBio,
            organization: body.organization,
            location: body.location,
            website: body.website,
        });
        return res.redirect('/profile');
    }
    async profileDelete(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        await this.authService.deleteCurrentUser(req, res);
        return res.redirect('/');
    }
    registerGoogle(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            return this.toMainSite(req, res, '/login/google');
        }
        return res.redirect('/login/google');
    }
    async googleCallback(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        const { user, desktopRedirectUri } = await this.authService.handleGoogleCallback(req, res);
        if (desktopRedirectUri) {
            const codeChallenge = this.authService.readDesktopChallengeCookie(req, res);
            if (!codeChallenge) {
                return res.render('pages/desktop-success', { success: false, error: 'Session expired. Please try again.' });
            }
            const otcToken = await this.authService.createDesktopOtc(user.id, desktopRedirectUri, codeChallenge);
            return res.redirect(`${desktopRedirectUri}?token=${otcToken}`);
        }
        const returnUrl = req.cookies?.ja_return_url;
        res.clearCookie('ja_return_url', { path: '/' });
        const safeReturn = this.safeLocalReturnPath(returnUrl) || '/profile';
        return res.redirect(safeReturn);
    }
    async desktopToken(req, body) {
        const { token, codeVerifier } = body;
        if (!token || !codeVerifier) {
            throw new common_1.BadRequestException('token and codeVerifier are required.');
        }
        const result = await this.authService.exchangeDesktopOtc(token, codeVerifier);
        return {
            accessToken: result.accessToken,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                picture: result.user.picture,
                role: result.user.role,
                thinkerSubscriptionStatus: result.user.thinkerSubscriptionStatus ?? null,
                paddleSubscriptionStatus: result.user.paddleSubscriptionStatus ?? null,
            },
        };
    }
    async desktopSession(req) {
        return this.authService.checkDesktopSession(req);
    }
    async analyticsPostViewStart(req, body) {
        const user = this.authService.getCurrentUser(req);
        return this.analyticsService.startPostView(req, body, user?.id);
    }
    async analyticsPostViewHeartbeat(body) {
        return this.analyticsService.heartbeatPostView(body);
    }
    async apiMe(req) {
        const sessionUser = this.authService.getCurrentUser(req);
        const user = sessionUser ?? await this.authService.verifyBearerToken(req);
        if (!user) {
            return { authenticated: false };
        }
        return {
            authenticated: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                picture: user.picture,
                role: user.role,
                thinkerSubscriptionStatus: user.thinkerSubscriptionStatus ?? null,
                paddleSubscriptionStatus: user.paddleSubscriptionStatus ?? null,
            },
        };
    }
    desktopSuccess(res) {
        return res.render('pages/desktop-success', { success: true });
    }
    privacy(req, res) {
        return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'privacy.html'));
    }
    privacyHtml(req, res) {
        return res.redirect(301, '/privacy');
    }
    terms(req, res) {
        return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'terms.html'));
    }
    termsHtml(req, res) {
        return res.redirect(301, '/terms');
    }
    refunds(req, res) {
        return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'refunds.html'));
    }
    refundsHtml(req, res) {
        return res.redirect(301, '/refunds');
    }
    async logout(req, res) {
        await this.authService.logout(req, res);
        return res.redirect('/');
    }
    projectAlias(req, res) {
        const project = Array.isArray(req.params.project) ? req.params.project[0] : req.params.project;
        switch (project) {
            case 'skillsminds':
                return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'articles', 'index.html'));
            case 'nofacethinker':
                return res.redirect('/nofacethinker');
            case 'courses':
                return res.redirect('/courses/ai-agents-course.html');
            case 'apps':
                return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage('apps'), req));
            case 'games':
                return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage('games'), req));
            case 'shop':
                return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage('shop'), req));
            case 'api':
                return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage('api'), req));
            default:
                throw new common_1.NotFoundException();
        }
    }
    async skillsmindsProject(req, res) {
        const posts = await this.postService.listPublished('skillsminds');
        return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('skillsminds', posts), req));
    }
    async skillsmindsPost(req, res, slug) {
        const post = await this.postService.getBySlug('skillsminds', slug);
        return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post), req));
    }
    programmingArticleShortcut(req, res) {
        const rawFile = req.params.file;
        const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
        if (!/\.html$/i.test(file)) {
            throw new common_1.NotFoundException();
        }
        const found = (0, path_1.join)(process.cwd(), 'articles', 'programming', file);
        if (!(0, fs_1.existsSync)(found)) {
            throw new common_1.NotFoundException();
        }
        return res.redirect(301, `/articles/programming/${file}`);
    }
    async nofacethinkerProject(req, res) {
        const user = this.authService.getCurrentUser(req);
        const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
        const posts = await this.postService.listPublished('nofacethinker');
        if (!isSubscribed) {
            return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getThinkerPreviewListPage(posts), req));
        }
        return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('nofacethinker', posts), req));
    }
    async nofacethinkerPost(req, res, slug) {
        const user = this.authService.getCurrentUser(req);
        const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
        const post = await this.postService.getBySlug('nofacethinker', slug);
        if (!isSubscribed) {
            return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post, true), req));
        }
        return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post, false), req));
    }
    async subdomainPost(req, res, slug) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site === 'skillsminds') {
            const post = await this.postService.getBySlug('skillsminds', slug);
            return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post), req));
        }
        if (site === 'nofacethinker') {
            const user = this.authService.getCurrentUser(req);
            const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
            const post = await this.postService.getBySlug('nofacethinker', slug);
            return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post, !isSubscribed), req));
        }
        throw new common_1.NotFoundException();
    }
    coursesProject(req, res) {
        return res.redirect('/courses/ai-agents-course.html');
    }
    appsProject(req, res) {
        return res.render('pages/apps-landing', this.withSharedModel(this.getAppsLandingPage(), req));
    }
    gamesProject(req) {
        return this.withSharedModel(this.siteService.getComingSoonPage('games'), req);
    }
    shopProject(req) {
        return this.withSharedModel(this.siteService.getComingSoonPage('shop'), req);
    }
    apiProject(req) {
        return this.withSharedModel(this.siteService.getComingSoonPage('api'), req);
    }
    appDetail(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'apps') {
            throw new common_1.NotFoundException();
        }
        return res.sendFile((0, path_1.join)(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
    }
    appDetailPath(req, res) {
        return res.sendFile((0, path_1.join)(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
    }
    appDetailAlias(res) {
        return res.redirect(301, '/apps/justaidyn-screencam');
    }
    dynamicAppDetail(req, res, slug) {
        const app = this.appCatalogService.getPublished(slug);
        return res.render('pages/app-detail', this.withSharedModel(this.getAppDetailPage(app), req));
    }
    aiAgentsCourse(res) {
        return res.redirect(301, '/courses/ai-agents-course.html');
    }
    aiAgentsLite(res) {
        return res.redirect(301, '/courses/ai-agents-lite-group.html');
    }
    aiAgentsStandard(res) {
        return res.redirect(301, '/courses/ai-agents-standard-group.html');
    }
    aiAgentsStandardPlus(res) {
        return res.redirect(301, '/courses/ai-agents-standard-plus-group.html');
    }
    aiAgentsVip(res) {
        return res.redirect(301, '/courses/ai-agents-vip-group.html');
    }
    aiAgentsLearningSteps(res) {
        return res.redirect(301, '/courses/ai-agents-learning-steps.html');
    }
    aiAgentsLearningPrinciples(res) {
        return res.redirect(301, '/courses/ai-agents-learning-principles.html');
    }
    apiHealth(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'api' && site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return {
            ok: true,
            app: 'justaidyn-platform',
            host: req.hostname,
            timestamp: new Date().toISOString(),
        };
    }
    apiHealthPath(req) {
        return {
            ok: true,
            app: 'justaidyn-platform',
            host: req.hostname,
            timestamp: new Date().toISOString(),
        };
    }
    get desktopVersionPath() {
        return (0, path_1.join)(process.cwd(), 'desktop-version.json');
    }
    readDesktopVersion() {
        if (!(0, fs_1.existsSync)(this.desktopVersionPath)) {
            return { version: '0.0.0', minVersion: '0.0.0', downloadUrl: '', releaseNotes: '', required: false };
        }
        try {
            return JSON.parse((0, fs_1.readFileSync)(this.desktopVersionPath, 'utf-8'));
        }
        catch {
            throw new common_1.BadRequestException('desktop-version.json is malformed.');
        }
    }
    getDesktopVersion() {
        return this.readDesktopVersion();
    }
    setDesktopVersion(req, body) {
        this.authService.getSuperadminUser(req);
        const version = typeof body.version === 'string' ? body.version.trim() : '';
        const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : '';
        const releaseNotes = typeof body.releaseNotes === 'string' ? body.releaseNotes.trim() : '';
        if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
            throw new common_1.BadRequestException('version must be in format X.Y.Z');
        }
        if (!downloadUrl)
            throw new common_1.BadRequestException('downloadUrl is required.');
        const data = {
            version,
            minVersion: version,
            downloadUrl,
            releaseNotes,
            required: true,
            updatedAt: new Date().toISOString(),
        };
        (0, fs_1.writeFileSync)(this.desktopVersionPath, JSON.stringify(data, null, 2), 'utf-8');
        return data;
    }
    async paddleThinkerVerifyCheckout(req) {
        const user = await this.authService.verifyThinkerCheckoutAndSave(req);
        return { subscriptionStatus: user.thinkerSubscriptionStatus, subscribedAt: user.thinkerSubscribedAt };
    }
    async paddleThinkerCancel(req) {
        await this.authService.cancelThinkerSubscription(req);
        return { canceled: true };
    }
    async sitemap(res) {
        const base = 'https://justaidyn.com';
        const [skillsPosts, thinkerPosts] = await Promise.all([
            this.postService.listPublished('skillsminds'),
            this.postService.listPublished('nofacethinker'),
        ]);
        const staticUrls = [
            { loc: `${base}/`, priority: '1.0', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/projects.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/faq.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/education.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/experience.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/ml-models.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/terms.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/eula.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/privacy.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/cookie-policy.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/refunds.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/subscription-terms.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/dmca.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/legal-notice.html`, priority: '0.5', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-course.html`, priority: '0.9', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-lite-group.html`, priority: '0.8', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-standard-group.html`, priority: '0.8', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-standard-plus-group.html`, priority: '0.8', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-vip-group.html`, priority: '0.8', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-learning-steps.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/ai-agents-learning-principles.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/courses/faq.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/`, priority: '0.8', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/modern-ai-from-chats-to-digital-coworkers.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-learners.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-entrepreneurs-and-business-owners.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-teachers-and-tutors.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-marketers-and-sales-professionals.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-office-workers-and-managers.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-parents.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-for-researchers-and-evidence-based-thinking.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/codex-in-self-development-and-personal-life.html`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/ai-and-ml/how-to-subscribe-chatgpt-plus.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/installing-visual-studio-code.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/installing-nodejs-and-setting-up-path.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/installing-qdrant-first-use-python-nestjs.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/installing-docker.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/installing-python-and-setting-up-path.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/github-registration-and-repository-creation.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/articles/programming/adding-codex-to-visual-studio-code.html`, priority: '0.6', changefreq: 'monthly', lastmod: '2026-05-01' },
            { loc: `${base}/skillsminds`, priority: '0.9', changefreq: 'daily', lastmod: '2026-05-01' },
            { loc: `${base}/nofacethinker`, priority: '0.8', changefreq: 'daily', lastmod: '2026-05-01' },
            { loc: `${base}/apps`, priority: '0.7', changefreq: 'weekly', lastmod: '2026-05-01' },
            { loc: `${base}/apps/justaidyn-screencam/`, priority: '0.7', changefreq: 'monthly', lastmod: '2026-05-01' },
        ];
        const postUrls = [
            ...skillsPosts.map(p => ({ loc: `${base}/skillsminds/post/${p.slug}`, priority: '0.8', changefreq: 'monthly', lastmod: p.publishedAt?.slice(0, 10) })),
            ...thinkerPosts.map(p => ({ loc: `${base}/nofacethinker/post/${p.slug}`, priority: '0.6', changefreq: 'monthly', lastmod: p.publishedAt?.slice(0, 10) })),
        ];
        const allUrls = [...staticUrls, ...postUrls];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>`;
        res.set('Content-Type', 'application/xml; charset=utf-8');
        return res.send(xml);
    }
    async paddleWebhook(req, body, res) {
        try {
            this.authService.verifyPaddleWebhookSignature(this.getHeaderValue(req.headers['paddle-signature']), req.rawBody);
            await this.authService.handlePaddleWebhook(body);
            return res.status(200).json({ received: true });
        }
        catch {
        }
        return res.status(401).json({ received: false });
    }
    async paddleVerifyCheckout(req) {
        const user = await this.authService.verifyCheckoutAndSave(req);
        return {
            subscriptionStatus: user.paddleSubscriptionStatus,
            subscribedAt: user.paddleSubscribedAt,
        };
    }
    async paddleCancelSubscription(req) {
        await this.authService.cancelUserSubscription(req);
        return { canceled: true };
    }
    serveSectionLegacyFile(req, res) {
        const rawSection = req.path.split('/').filter(Boolean)[0];
        const rawFile = req.params.file;
        const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;
        const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
        const root = process.cwd();
        const sectionMap = {
            skillsminds: 'skillsminds',
            nofacethinker: 'nofacethinker',
            courses: 'courses',
            apps: 'apps',
            games: 'games',
            shop: 'shop',
            api: 'api',
        };
        if (!sectionMap[section] || !/\.(html|txt|xml|png)$/i.test(file)) {
            throw new common_1.NotFoundException();
        }
        if (section === 'courses' && /\.html$/i.test(file)) {
            const coursePageMap = {
                'ai-agents-course.html': { title: 'JustAidyn Courses | AI Agents Course', key: 'course-home' },
                'ai-agents-lite-group.html': { title: 'AI Agents Course | Lite Group', key: 'lite-group' },
                'ai-agents-standard-group.html': { title: 'AI Agents Course | Standard Group', key: 'standard-group' },
                'ai-agents-standard-plus-group.html': { title: 'AI Agents Course | Standard+ Group', key: 'standard-plus-group' },
                'ai-agents-vip-group.html': { title: 'AI Agents Course | VIP Group', key: 'vip-group' },
                'ai-agents-learning-steps.html': { title: 'AI Agents Course | Learning Steps', key: 'learning-steps' },
                'ai-agents-learning-principles.html': { title: 'AI Agents Course | Learning Principles', key: 'learning-principles' },
            };
            const coursePage = coursePageMap[file.replace(/ /g, '+')];
            if (coursePage) {
                return res.render('pages/course-wrapper', this.withSharedModel(this.siteService.getCoursePageModel(coursePage.title, coursePage.key), req));
            }
        }
        const found = (0, path_1.join)(root, sectionMap[section], file);
        if (!(0, fs_1.existsSync)(found)) {
            throw new common_1.NotFoundException();
        }
        if (/\.html$/i.test(file)) {
            return this.renderStaticHtmlFile(req, res, found);
        }
        return res.sendFile(found);
    }
    serveLegacyFile(req, res) {
        const rawFile = req.params.file;
        const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
        const normalizedFile = file.replace(/ /g, '+');
        const site = this.siteService.resolveHost(req.hostname);
        const root = process.cwd();
        const coursePageMap = {
            'ai-agents-course.html': {
                title: 'JustAidyn Courses | AI Agents Course',
                key: 'course-home',
            },
            'ai-agents-lite-group.html': {
                title: 'AI Agents Course | Lite Group',
                key: 'lite-group',
            },
            'ai-agents-standard-group.html': {
                title: 'AI Agents Course | Standard Group',
                key: 'standard-group',
            },
            'ai-agents-standard-plus-group.html': {
                title: 'AI Agents Course | Standard+ Group',
                key: 'standard-plus-group',
            },
            'ai-agents-vip-group.html': {
                title: 'AI Agents Course | VIP Group',
                key: 'vip-group',
            },
            'ai-agents-learning-steps.html': {
                title: 'AI Agents Course | Три этапа обучения',
                key: 'learning-steps',
            },
            'ai-agents-learning-principles.html': {
                title: 'AI Agents Course | Три принципа обучения',
                key: 'learning-principles',
            },
        };
        if (!/\.(html|txt|xml|png)$/i.test(file)) {
            throw new common_1.NotFoundException();
        }
        if ((site === 'main' || site === 'courses') && coursePageMap[normalizedFile]) {
            const coursePage = coursePageMap[normalizedFile];
            return res.render('pages/course-wrapper', this.withSharedModel(this.siteService.getCoursePageModel(coursePage.title, coursePage.key), req));
        }
        const siteFolder = this.siteService.getLegacyFolderForSite(site);
        const candidatePaths = [];
        if (siteFolder === '') {
            candidatePaths.push((0, path_1.join)(root, file));
        }
        else if (siteFolder) {
            candidatePaths.push((0, path_1.join)(root, siteFolder, file));
        }
        candidatePaths.push((0, path_1.join)(root, file));
        const found = candidatePaths.find((candidate) => (0, fs_1.existsSync)(candidate));
        if (!found) {
            throw new common_1.NotFoundException();
        }
        const standalonePages = ['kaspiqr.html', 'programming-course.html'];
        if (/\.html$/i.test(file) && site === 'main' && !standalonePages.includes(file)) {
            return this.renderStaticHtmlFile(req, res, found);
        }
        return res.sendFile(found);
    }
    getDownloadStats() {
        return this.readDownloadCounts();
    }
    trackDownload(app, res) {
        const countsFile = (0, path_1.join)(process.cwd(), 'data', 'download-counts.json');
        try {
            const counts = JSON.parse((0, fs_1.readFileSync)(countsFile, 'utf-8'));
            counts[app] = (counts[app] || 0) + 1;
            (0, fs_1.writeFileSync)(countsFile, JSON.stringify(counts, null, 2));
        }
        catch {
        }
        return res.redirect(this.appCatalogService.getDownloadUrl(app));
    }
    getAppsLandingPage() {
        const counts = this.readDownloadCounts();
        const apps = this.appCatalogService.listPublished().map((app) => ({
            ...app,
            downloadCount: Number(counts[app.slug] || 0),
            detailUrl: `/apps/${app.slug}`,
            trackUrl: `/track/download/apps/${app.slug}`,
        }));
        const totalDownloads = apps.reduce((sum, app) => sum + app.downloadCount, 0);
        return {
            title: 'Apps | JustAidyn',
            description: 'Download JustAidyn desktop applications and view latest releases.',
            pageKey: 'apps',
            view: 'apps-landing',
            lowerNav: [
                { labelEn: 'Apps', labelRu: 'Apps', labelKk: 'Apps', url: '/apps', active: true },
            ],
            heroTitle: 'JustAidyn Apps',
            heroText: 'Desktop programs built for recording, productivity, and future JustAidyn tools.',
            apps,
            totalDownloads,
            appCount: apps.length,
        };
    }
    getAppDetailPage(app) {
        const downloadCount = Number(this.readDownloadCounts()[app.slug] || 0);
        return {
            title: `${app.name} | JustAidyn Apps`,
            description: app.shortDescription || app.description,
            pageKey: `app-${app.slug}`,
            view: 'app-detail',
            lowerNav: [
                { labelEn: 'Apps', labelRu: 'Приложения', labelKk: 'Қолданбалар', url: '/apps' },
                { labelEn: app.name, labelRu: app.name, labelKk: app.name, url: `/apps/${app.slug}`, active: true },
            ],
            heroTitle: app.name,
            heroText: app.shortDescription || app.description,
            releaseVersion: app.version,
            releaseNotes: app.releaseNotes || 'Latest installer is available for download.',
            downloadCount,
            primaryAction: { label: 'Download latest', url: `/track/download/apps/${app.slug}` },
            secondaryAction: { label: 'All apps', url: '/apps' },
            features: [
                {
                    icon: 'bi-cloud-arrow-down',
                    title: 'Latest release delivery',
                    text: 'The download button always points to the current installer published from the JustAidyn admin panel.',
                },
                {
                    icon: 'bi-shield-check',
                    title: 'Account-based access',
                    text: 'Products can use JustAidyn sign-in and subscription status checks when access control is required.',
                },
                {
                    icon: 'bi-arrow-repeat',
                    title: 'Update-ready page',
                    text: 'Version, release notes, and installer metadata are shown from the app catalog.',
                },
            ],
            pricingTitle: 'Simple access for this JustAidyn program.',
            pricingText: 'Each product page includes pricing, download, terms, and support sections so customers can evaluate the program before installing it.',
            planName: 'Product access',
            price: 'See plan',
            pricePeriod: 'on checkout',
            oldPrice: '',
            pricingNote: 'Pricing and access rules are controlled by the product configuration. Subscription quantity can define simultaneous active sessions for products that require session checks.',
            included: [
                'Latest installer download',
                'Release notes and current version information',
                'JustAidyn account support',
                'Subscription and refund terms linked from the page',
            ],
            sections: [
                {
                    id: 'about',
                    title: 'About',
                    text: app.description,
                },
                {
                    id: 'release',
                    title: `Latest version ${app.version}`,
                    text: app.releaseNotes || 'Latest installer is available for download.',
                },
            ],
        };
    }
    readDownloadCounts() {
        const countsFile = (0, path_1.join)(process.cwd(), 'data', 'download-counts.json');
        try {
            const parsed = JSON.parse((0, fs_1.readFileSync)(countsFile, 'utf-8'));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                return {};
            return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Number(value) || 0]));
        }
        catch {
            return {};
        }
    }
    withSharedModel(page, req) {
        const host = req?.hostname?.toLowerCase().split(':')[0] || '';
        const isLocalIp = host === 'localhost' || host === '127.0.0.1';
        const isLocalDomain = host.endsWith('.justaidyn.local');
        const noIndexPageKeys = new Set([
            'login',
            'register',
            'profile',
            'profile-edit',
            'admin',
            'admin-login',
            'admin-users',
            'admin-section',
            'admin-reset-request',
            'admin-reset-set',
            'admin-posts',
            'admin-post-form',
            'admin-analytics',
            'admin-apps',
        ]);
        const mainSiteUrl = isLocalIp ? 'http://localhost:3000'
            : isLocalDomain ? 'http://justaidyn.local:3000'
                : 'https://justaidyn.com';
        const requestPath = (req?.originalUrl || req?.url || '/').split('?')[0].split('#')[0] || '/';
        const canonicalPath = requestPath === '/articles' ? '/articles/' : requestPath;
        const canonicalHost = !host || isLocalIp || isLocalDomain ? 'justaidyn.com' : host;
        const canonicalUrl = `https://${canonicalHost}${canonicalPath}`;
        const sub = (name) => isLocalIp
            ? `http://localhost:3000/${name}`
            : isLocalDomain ? `http://${name}.justaidyn.local:3000`
                : `https://${name}.justaidyn.com`;
        return {
            ...page,
            noIndex: noIndexPageKeys.has(page.pageKey),
            canonicalUrl,
            year: new Date().getFullYear(),
            currentUser: req ? this.authService.getCurrentUser(req) : null,
            projectLinks: this.siteService.getProjects(),
            mainSiteUrl,
            projectsUrl: `${mainSiteUrl}/projects`,
            articlesUrl: `${mainSiteUrl}/articles/`,
            downloadsUrl: `${mainSiteUrl}/downloads/`,
            skillsmindsUrl: sub('skillsminds'),
            nofacethinkerUrl: sub('nofacethinker'),
            coursesUrl: sub('courses'),
            appsUrl: sub('apps'),
            gamesUrl: sub('games'),
            shopUrl: sub('shop'),
            apiUrl: sub('api'),
        };
    }
    toMainSite(req, res, path) {
        const host = req.hostname?.toLowerCase().split(':')[0] || '';
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.justaidyn.local');
        const base = isLocal ? 'http://localhost:3000' : 'https://justaidyn.com';
        return res.redirect(302, `${base}${path}`);
    }
    renderStaticHtmlFile(req, res, filePath) {
        try {
            const html = (0, fs_1.readFileSync)(filePath, 'utf-8');
            const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (!mainMatch) {
                return res.sendFile(filePath);
            }
            const content = mainMatch[1]
                .replace(/src="images\//g, 'src="/images/')
                .replace(/href="images\//g, 'href="/images/')
                .replace(/src="\.\.\/images\//g, 'src="/images/')
                .replace(/href="\.\.\/images\//g, 'href="/images/');
            const title = titleMatch ? titleMatch[1].trim() : 'JustAidyn';
            return res.render('pages/static-wrapper', this.withSharedModel(this.siteService.getStaticPageModel(title, content), req));
        }
        catch {
            return res.sendFile(filePath);
        }
    }
    renderAdminSection(req, res, section) {
        if (!this.tryRequireSuperadmin(req, res)) {
            return;
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminSectionPage(section), req));
    }
    tryRequireSuperadmin(req, res) {
        try {
            this.authService.getSuperadminUser(req);
            return true;
        }
        catch {
            res.redirect('/admin/login');
            return false;
        }
    }
    parseDesktopRedirectUri(value) {
        try {
            const url = new URL(value);
            const port = Number(url.port);
            const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
            const isValidPort = Number.isInteger(port) && port >= 1 && port <= 65535;
            if (url.protocol !== 'http:' || !isLoopback || !isValidPort || url.pathname !== '/oauth2callback') {
                return null;
            }
            return url;
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
    getHeaderValue(value) {
        return Array.isArray(value) ? value[0] : value;
    }
    safeLocalReturnPath(value) {
        if (typeof value !== 'string')
            return '';
        if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
            return '';
        try {
            const parsed = new URL(value, 'https://justaidyn.com');
            if (parsed.origin !== 'https://justaidyn.com')
                return '';
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        catch {
            return '';
        }
    }
};
exports.SiteController = SiteController;
__decorate([
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('/projects'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "projects", null);
__decorate([
    (0, common_1.Get)('/login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('/admin/login'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.Post)('/admin/login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminLoginPost", null);
__decorate([
    (0, common_1.Get)('/admin/password-reset'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminPasswordReset", null);
__decorate([
    (0, common_1.Post)('/admin/password-reset'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPasswordResetPost", null);
__decorate([
    (0, common_1.Get)('/admin/password-reset/:token'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminPasswordResetSet", null);
__decorate([
    (0, common_1.Post)('/admin/password-reset/:token'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('token')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPasswordResetSetPost", null);
__decorate([
    (0, common_1.Get)('/admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminDashboard", null);
__decorate([
    (0, common_1.Get)('/admin/users'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminUsers", null);
__decorate([
    (0, common_1.Get)('/admin/posts'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPosts", null);
__decorate([
    (0, common_1.Get)('/admin/analytics'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminAnalytics", null);
__decorate([
    (0, common_1.Get)('/admin/posts/new'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminPostNew", null);
__decorate([
    (0, common_1.Post)('/admin/posts/new'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPostCreate", null);
__decorate([
    (0, common_1.Get)('/admin/posts/:id/edit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPostEdit", null);
__decorate([
    (0, common_1.Post)('/admin/posts/:id/edit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPostUpdate", null);
__decorate([
    (0, common_1.Post)('/admin/posts/:id/delete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "adminPostDelete", null);
__decorate([
    (0, common_1.Get)('/admin/apps'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminApps", null);
__decorate([
    (0, common_1.Get)('/admin/apps/:slug/edit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminAppEdit", null);
__decorate([
    (0, common_1.Post)('/admin/apps/save'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminAppSave", null);
__decorate([
    (0, common_1.Post)('/admin/apps/:slug/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('installer', installerUpload)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminAppUpload", null);
__decorate([
    (0, common_1.Get)('/admin/games'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminGames", null);
__decorate([
    (0, common_1.Get)('/admin/courses'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "adminCourses", null);
__decorate([
    (0, common_1.Get)('/register'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('/login/google'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "loginGoogle", null);
__decorate([
    (0, common_1.Get)('/profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "profile", null);
__decorate([
    (0, common_1.Get)('/profile/edit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "profileEdit", null);
__decorate([
    (0, common_1.Post)('/profile/edit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "profileUpdate", null);
__decorate([
    (0, common_1.Post)('/profile/delete'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "profileDelete", null);
__decorate([
    (0, common_1.Get)('/register/google'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "registerGoogle", null);
__decorate([
    (0, common_1.Get)('/auth/google/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Post)('/api/desktop/token'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "desktopToken", null);
__decorate([
    (0, common_1.Get)('/api/desktop/session'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "desktopSession", null);
__decorate([
    (0, common_1.Post)('/api/analytics/post-view/start'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "analyticsPostViewStart", null);
__decorate([
    (0, common_1.Post)('/api/analytics/post-view/heartbeat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "analyticsPostViewHeartbeat", null);
__decorate([
    (0, common_1.Get)('/api/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "apiMe", null);
__decorate([
    (0, common_1.Get)('/desktop-success'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "desktopSuccess", null);
__decorate([
    (0, common_1.Get)('/privacy'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "privacy", null);
__decorate([
    (0, common_1.Get)('/privacy.html'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "privacyHtml", null);
__decorate([
    (0, common_1.Get)('/terms'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "terms", null);
__decorate([
    (0, common_1.Get)('/terms.html'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "termsHtml", null);
__decorate([
    (0, common_1.Get)('/refunds'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "refunds", null);
__decorate([
    (0, common_1.Get)('/refunds.html'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "refundsHtml", null);
__decorate([
    (0, common_1.Get)('/logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('/p/:project'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "projectAlias", null);
__decorate([
    (0, common_1.Get)('/skillsminds'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "skillsmindsProject", null);
__decorate([
    (0, common_1.Get)('/skillsminds/post/:slug'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "skillsmindsPost", null);
__decorate([
    (0, common_1.Get)('/programming/:file'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "programmingArticleShortcut", null);
__decorate([
    (0, common_1.Get)('/nofacethinker'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "nofacethinkerProject", null);
__decorate([
    (0, common_1.Get)('/nofacethinker/post/:slug'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "nofacethinkerPost", null);
__decorate([
    (0, common_1.Get)('/post/:slug'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "subdomainPost", null);
__decorate([
    (0, common_1.Get)('/courses'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "coursesProject", null);
__decorate([
    (0, common_1.Get)('/apps'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appsProject", null);
__decorate([
    (0, common_1.Get)('/games'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "gamesProject", null);
__decorate([
    (0, common_1.Get)('/shop'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "shopProject", null);
__decorate([
    (0, common_1.Get)('/api'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "apiProject", null);
__decorate([
    (0, common_1.Get)(['/justaidyn-screencam', '/justaidyn-screencam/']),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetail", null);
__decorate([
    (0, common_1.Get)(['/apps/justaidyn-screencam', '/apps/justaidyn-screencam/']),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetailPath", null);
__decorate([
    (0, common_1.Get)('/p/apps/justaidyn-screencam'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetailAlias", null);
__decorate([
    (0, common_1.Get)('/apps/:slug'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "dynamicAppDetail", null);
__decorate([
    (0, common_1.Get)('/ai-agents-course.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsCourse", null);
__decorate([
    (0, common_1.Get)('/ai-agents-lite-group.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsLite", null);
__decorate([
    (0, common_1.Get)('/ai-agents-standard-group.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsStandard", null);
__decorate([
    (0, common_1.Get)('/ai-agents-standard-plus-group.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsStandardPlus", null);
__decorate([
    (0, common_1.Get)('/ai-agents-vip-group.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsVip", null);
__decorate([
    (0, common_1.Get)('/ai-agents-learning-steps.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsLearningSteps", null);
__decorate([
    (0, common_1.Get)('/ai-agents-learning-principles.html'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsLearningPrinciples", null);
__decorate([
    (0, common_1.Get)('/health'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "apiHealth", null);
__decorate([
    (0, common_1.Get)('/api/health'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "apiHealthPath", null);
__decorate([
    (0, common_1.Get)('/api/version/desktop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "getDesktopVersion", null);
__decorate([
    (0, common_1.Post)('/api/admin/version/desktop'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "setDesktopVersion", null);
__decorate([
    (0, common_1.Post)('/api/paddle/thinker/verify-checkout'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "paddleThinkerVerifyCheckout", null);
__decorate([
    (0, common_1.Post)('/api/paddle/thinker/cancel'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "paddleThinkerCancel", null);
__decorate([
    (0, common_1.Get)('/sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "sitemap", null);
__decorate([
    (0, common_1.Post)('/api/paddle/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "paddleWebhook", null);
__decorate([
    (0, common_1.Post)('/api/paddle/verify-checkout'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "paddleVerifyCheckout", null);
__decorate([
    (0, common_1.Post)('/api/paddle/subscription/cancel'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SiteController.prototype, "paddleCancelSubscription", null);
__decorate([
    (0, common_1.Get)([
        '/skillsminds/:file',
        '/nofacethinker/:file',
        '/courses/:file',
        '/apps/:file',
        '/games/:file',
        '/shop/:file',
        '/api/:file',
    ]),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "serveSectionLegacyFile", null);
__decorate([
    (0, common_1.Get)('/:file'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "serveLegacyFile", null);
__decorate([
    (0, common_1.Get)('/api/stats/downloads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "getDownloadStats", null);
__decorate([
    (0, common_1.Get)('/track/download/apps/:app'),
    __param(0, (0, common_1.Param)('app')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "trackDownload", null);
exports.SiteController = SiteController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [site_service_1.SiteService,
        auth_service_1.AuthService,
        post_service_1.PostService,
        analytics_service_1.AnalyticsService,
        app_catalog_service_1.AppCatalogService])
], SiteController);
