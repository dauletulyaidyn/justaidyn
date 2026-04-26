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
const site_service_1 = require("./site.service");
let SiteController = class SiteController {
    constructor(siteService) {
        this.siteService = siteService;
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
    register(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getRegisterPage(), req);
    }
    loginGoogle(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getAuthProviderPage('login', 'google'), req);
    }
    loginApple(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getAuthProviderPage('login', 'apple'), req);
    }
    registerGoogle(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getAuthProviderPage('register', 'google'), req);
    }
    registerApple(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getAuthProviderPage('register', 'apple'), req);
    }
    projectAlias(req, res) {
        const project = Array.isArray(req.params.project) ? req.params.project[0] : req.params.project;
        switch (project) {
            case 'skillsminds':
                return res.sendFile((0, path_1.join)(process.cwd(), 'articles', 'index.html'));
            case 'nofacethinker':
                return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage('nofacethinker'), req));
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
    skillsmindsProject(res) {
        return res.sendFile((0, path_1.join)(process.cwd(), 'articles', 'index.html'));
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
    nofacethinkerProject(req) {
        return this.withSharedModel(this.siteService.getComingSoonPage('nofacethinker'), req);
    }
    coursesProject(req, res) {
        return res.redirect('/courses/ai-agents-course.html');
    }
    appsProject(res) {
        return res.sendFile((0, path_1.join)(process.cwd(), 'apps', 'index.html'));
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
    appDetailPath(res) {
        return res.sendFile((0, path_1.join)(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
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
        const found = (0, path_1.join)(root, sectionMap[section], file);
        if (!(0, fs_1.existsSync)(found)) {
            throw new common_1.NotFoundException();
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
            try {
                const html = (0, fs_1.readFileSync)(found, 'utf-8');
                const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
                const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                if (mainMatch) {
                    const content = mainMatch[1]
                        .replace(/src="images\//g, 'src="/images/')
                        .replace(/href="images\//g, 'href="/images/');
                    const title = titleMatch ? titleMatch[1].trim() : 'JustAidyn';
                    return res.render('pages/static-wrapper', this.withSharedModel(this.siteService.getStaticPageModel(title, content), req));
                }
            }
            catch {
            }
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
            projectLinks: this.siteService.getProjects(),
            mainSiteUrl,
            projectsUrl: `${mainSiteUrl}/projects`,
            articlesUrl: `${mainSiteUrl}/articles/`,
            downloadsUrl: `${mainSiteUrl}/downloads/`,
        };
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
    (0, common_1.Get)('/register'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('/login/google'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "loginGoogle", null);
__decorate([
    (0, common_1.Get)('/login/apple'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "loginApple", null);
__decorate([
    (0, common_1.Get)('/register/google'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "registerGoogle", null);
__decorate([
    (0, common_1.Get)('/register/apple'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "registerApple", null);
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
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "skillsmindsProject", null);
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
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "nofacethinkerProject", null);
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
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
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
    __metadata("design:paramtypes", [site_service_1.SiteService])
], SiteController);
