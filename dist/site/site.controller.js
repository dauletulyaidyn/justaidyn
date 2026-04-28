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
const fs_1 = require("fs");
const path_1 = require("path");
const auth_service_1 = require("./auth.service");
const site_service_1 = require("./site.service");
const post_service_1 = require("./post.service");
let SiteController = class SiteController {
    constructor(siteService, authService, postService) {
        this.siteService = siteService;
        this.authService = authService;
        this.postService = postService;
    }
    root(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site === 'main') {
            return res.render('pages/home', this.withSharedModel(this.siteService.getHomePage(), req));
        }
        if (site === 'courses') {
            return res.render('pages/course-wrapper', this.withSharedModel(this.siteService.getCoursePageModel('JustAidyn Courses | AI Agents Course', 'course-home'), req));
        }
        return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage(site), req));
    }
    projects(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getProjectsPage(), req);
    }
    login(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getLoginPage(), req);
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
        return this.renderAdminSection(req, res, 'Apps');
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
            throw new common_1.NotFoundException();
        }
        return res.redirect('/login');
    }
    async loginGoogle(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        const desktopAuthUrl = this.buildGoogleDesktopAuthUrl(req, 'login');
        if (desktopAuthUrl) {
            return res.redirect(desktopAuthUrl);
        }
        const authUrl = await this.authService.buildGoogleWebAuthUrl(req, 'login');
        this.authService.setOAuthStateCookie(res, authUrl, req);
        return res.redirect(authUrl);
    }
    profile(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
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
            throw new common_1.NotFoundException();
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
            throw new common_1.NotFoundException();
        }
        return res.redirect('/login/google');
    }
    async googleCallback(req, res) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        await this.authService.handleGoogleCallback(req, res);
        return res.redirect('/profile');
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
    coursesProject(req, res) {
        return res.redirect('/courses/ai-agents-course.html');
    }
    appsProject(req, res) {
        return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'apps', 'index.html'));
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
    appDetail(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'apps') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getComingSoonPage('apps'), req);
    }
    appDetailPath(req, res) {
        return this.renderStaticHtmlFile(req, res, (0, path_1.join)(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
    }
    appDetailAlias(req) {
        return this.withSharedModel(this.siteService.getComingSoonPage('apps'), req);
    }
    aiAgentsCourse(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('JustAidyn Courses | AI Agents Course', 'course-home'), req);
    }
    aiAgentsLite(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Lite Group', 'lite-group'), req);
    }
    aiAgentsStandard(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Standard Group', 'standard-group'), req);
    }
    aiAgentsStandardPlus(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Standard+ Group', 'standard-plus-group'), req);
    }
    aiAgentsVip(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | VIP Group', 'vip-group'), req);
    }
    aiAgentsLearningSteps(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Три этапа обучения', 'learning-steps'), req);
    }
    aiAgentsLearningPrinciples(req) {
        return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Три принципа обучения', 'learning-principles'), req);
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
    apiMe(req) {
        const user = this.authService.getCurrentUser(req);
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
                role: user.role,
                paddleSubscriptionStatus: user.paddleSubscriptionStatus ?? null,
                paddleSubscribedAt: user.paddleSubscribedAt ?? null,
                thinkerSubscriptionStatus: user.thinkerSubscriptionStatus ?? null,
                thinkerSubscribedAt: user.thinkerSubscribedAt ?? null,
            },
        };
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
            { loc: base, priority: '1.0', changefreq: 'weekly' },
            { loc: `${base}/skillsminds`, priority: '0.9', changefreq: 'daily' },
            { loc: `${base}/nofacethinker`, priority: '0.8', changefreq: 'daily' },
            { loc: `${base}/apps`, priority: '0.7', changefreq: 'weekly' },
            { loc: `${base}/apps/justaidyn-screencam/`, priority: '0.7', changefreq: 'monthly' },
            { loc: `${base}/courses/ai-agents-course.html`, priority: '0.8', changefreq: 'monthly' },
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
    paddleWebhook(body, res) {
        try {
            this.authService.handlePaddleWebhook(body);
        }
        catch {
        }
        return res.status(200).json({ received: true });
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
            return res.redirect(301, `/${file}`);
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
        if (site === 'main' && coursePageMap[normalizedFile]) {
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
        const countsFile = (0, path_1.join)(process.cwd(), 'data', 'download-counts.json');
        try {
            return JSON.parse((0, fs_1.readFileSync)(countsFile, 'utf-8'));
        }
        catch {
            return {};
        }
    }
    trackDownload(app, res) {
        const fileMap = {
            'justaidyn-screencam': '/downloads/apps/justaidyn-screencam/JustAidyn%20ScreenCam%201.1.1.msi',
        };
        if (!fileMap[app]) {
            throw new common_1.NotFoundException();
        }
        const countsFile = (0, path_1.join)(process.cwd(), 'data', 'download-counts.json');
        try {
            const counts = JSON.parse((0, fs_1.readFileSync)(countsFile, 'utf-8'));
            counts[app] = (counts[app] || 0) + 1;
            (0, fs_1.writeFileSync)(countsFile, JSON.stringify(counts, null, 2));
        }
        catch {
        }
        return res.redirect(fileMap[app]);
    }
    withSharedModel(page, req) {
        const host = req?.hostname?.toLowerCase().split(':')[0];
        const mainSiteUrl = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
        return {
            ...page,
            year: new Date().getFullYear(),
            currentUser: req ? this.authService.getCurrentUser(req) : null,
            projectLinks: this.siteService.getProjects(),
            mainSiteUrl,
            projectsUrl: `${mainSiteUrl}/projects`,
            articlesUrl: `${mainSiteUrl}/articles/`,
            downloadsUrl: `${mainSiteUrl}/downloads/`,
        };
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
    buildGoogleDesktopAuthUrl(req, mode) {
        const redirectUri = this.getQueryValue(req.query.redirect_uri);
        const codeChallenge = this.getQueryValue(req.query.code_challenge);
        const state = this.getQueryValue(req.query.state);
        if (!redirectUri && !codeChallenge) {
            return null;
        }
        if (!redirectUri || !codeChallenge) {
            throw new common_1.BadRequestException('Desktop Google OAuth requires redirect_uri and code_challenge.');
        }
        const redirectUrl = this.parseDesktopRedirectUri(redirectUri);
        if (!redirectUrl) {
            throw new common_1.BadRequestException('redirect_uri must be http://127.0.0.1:<port>/oauth2callback or http://localhost:<port>/oauth2callback.');
        }
        if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeChallenge)) {
            throw new common_1.BadRequestException('code_challenge must be a valid PKCE S256 challenge.');
        }
        if (state && state.length > 2048) {
            throw new common_1.BadRequestException('state is too long.');
        }
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', '1032118127228-9oin1kharh2kp6i9dg85r7i0s0j2tq5u.apps.googleusercontent.com');
        authUrl.searchParams.set('redirect_uri', redirectUrl.toString());
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        if (state) {
            authUrl.searchParams.set('state', state);
        }
        else {
            authUrl.searchParams.set('state', `justaidyn:${mode}:desktop`);
        }
        return authUrl.toString();
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
};
exports.SiteController = SiteController;
__decorate([
    (0, common_1.Get)('/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('/projects'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "projects", null);
__decorate([
    (0, common_1.Get)('/login'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    (0, common_1.Get)('/justaidyn-screencam'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetail", null);
__decorate([
    (0, common_1.Get)('/apps/justaidyn-screencam'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetailPath", null);
__decorate([
    (0, common_1.Get)('/p/apps/justaidyn-screencam'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetailAlias", null);
__decorate([
    (0, common_1.Get)('/ai-agents-course.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsCourse", null);
__decorate([
    (0, common_1.Get)('/ai-agents-lite-group.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsLite", null);
__decorate([
    (0, common_1.Get)('/ai-agents-standard-group.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsStandard", null);
__decorate([
    (0, common_1.Get)('/ai-agents-standard-plus-group.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsStandardPlus", null);
__decorate([
    (0, common_1.Get)('/ai-agents-vip-group.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsVip", null);
__decorate([
    (0, common_1.Get)('/ai-agents-learning-steps.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "aiAgentsLearningSteps", null);
__decorate([
    (0, common_1.Get)('/ai-agents-learning-principles.html'),
    (0, common_1.Render)('pages/course-wrapper'),
    __param(0, (0, common_1.Req)()),
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
    (0, common_1.Get)('/api/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "apiMe", null);
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
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
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
        post_service_1.PostService])
], SiteController);
