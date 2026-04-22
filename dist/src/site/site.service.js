"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteService = void 0;
const common_1 = require("@nestjs/common");
const ROOT_HOSTS = new Set(['justaidyn.com', 'www.justaidyn.com', 'localhost', '127.0.0.1']);
const PROJECT_LINKS = [
    { label: 'SkillsMinds', url: 'https://skillsminds.justaidyn.com/' },
    { label: 'NoFaceThinker', url: 'https://nofacethinker.justaidyn.com/' },
    { label: 'Courses', url: 'https://courses.justaidyn.com/' },
    { label: 'Apps', url: 'https://apps.justaidyn.com/' },
    { label: 'Games', url: 'https://games.justaidyn.com/' },
    { label: 'Shop', url: 'https://shop.justaidyn.com/' },
    { label: 'API', url: 'https://api.justaidyn.com/' },
];
let SiteService = class SiteService {
    resolveHost(hostname) {
        const host = (hostname || '').toLowerCase().split(':')[0];
        if (ROOT_HOSTS.has(host) || !host) {
            return 'main';
        }
        if (host === 'skillsminds.justaidyn.com')
            return 'skillsminds';
        if (host === 'nofacethinker.justaidyn.com')
            return 'nofacethinker';
        if (host === 'courses.justaidyn.com')
            return 'courses';
        if (host === 'apps.justaidyn.com')
            return 'apps';
        if (host === 'games.justaidyn.com')
            return 'games';
        if (host === 'shop.justaidyn.com')
            return 'shop';
        if (host === 'api.justaidyn.com')
            return 'api';
        return 'main';
    }
    getProjects() {
        return PROJECT_LINKS;
    }
    getHomePage() {
        return {
            view: 'pages/home',
            title: 'JustAidyn',
            description: 'JustAidyn platform: AI engineering, products, courses, apps, and experiments.',
            pageKey: 'home',
            eyebrow: 'JustAidyn',
            heroTitle: 'One platform for AI products, courses, apps, and experiments.',
            heroText: 'This NestJS baseline becomes the single entry point for justaidyn.com and all current subdomains. Header, footer, and routing are now centralized.',
            primaryAction: { label: 'Open Projects', url: '/projects' },
            secondaryAction: { label: 'Courses', url: 'https://courses.justaidyn.com/' },
            cards: [
                {
                    title: 'Unified Platform',
                    text: 'One backend and one layout layer for the main site, products, and future dashboards.',
                },
                {
                    title: 'Shared Navigation',
                    text: 'Header and footer are now controlled in one place instead of being duplicated in static HTML files.',
                },
                {
                    title: 'Gradual Migration',
                    text: 'Legacy pages stay in the repository while we replace them route by route inside NestJS.',
                },
            ],
        };
    }
    getProjectsPage() {
        return {
            view: 'pages/projects',
            title: 'Projects | JustAidyn',
            description: 'Current JustAidyn projects and subdomains.',
            pageKey: 'projects',
            eyebrow: 'Projects',
            heroTitle: 'Current JustAidyn project map.',
            heroText: 'The repo now has a central application layer and separate product surfaces. We will migrate each section incrementally into NestJS.',
            primaryAction: { label: 'Main Site', url: '/' },
            cards: PROJECT_LINKS.map((project) => ({
                title: project.label,
                text: `Open ${project.label} on its own subdomain.`,
                href: project.url,
                cta: 'Open',
            })),
        };
    }
    getAppsPage() {
        return {
            view: 'pages/apps',
            title: 'Apps | JustAidyn',
            description: 'JustAidyn apps hub.',
            pageKey: 'apps',
            eyebrow: 'Apps',
            heroTitle: 'JustAidyn application hub.',
            heroText: 'Applications will move here one by one. The first route is already wired into the NestJS platform.',
            primaryAction: { label: 'Open ScreenCam', url: '/justaidyn-screencam' },
            secondaryAction: { label: 'Back to Main Site', url: 'https://justaidyn.com/' },
            cards: [
                {
                    title: 'JustAidyn ScreenCam',
                    text: 'Download page, release routing, and product detail page are now ready to be migrated into the new app shell.',
                    href: '/justaidyn-screencam',
                    cta: 'Open app page',
                },
            ],
        };
    }
    getScreenCamPage() {
        return {
            view: 'pages/app-detail',
            title: 'JustAidyn ScreenCam',
            description: 'JustAidyn ScreenCam download page.',
            pageKey: 'app-detail',
            eyebrow: 'Desktop App',
            heroTitle: 'JustAidyn ScreenCam',
            heroText: 'Capture workflows and download management will live here. The binary is still served from the shared downloads directory.',
            primaryAction: {
                label: 'Download MSI',
                url: '/downloads/apps/justaidyn-screencam/JustAidyn%20ScreenCam%201.1.1.msi',
            },
            secondaryAction: { label: 'Open Downloads Folder', url: '/downloads/apps/justaidyn-screencam/' },
            cards: [
                {
                    title: 'Storage Folder',
                    text: 'File source: /downloads/apps/justaidyn-screencam/',
                },
                {
                    title: 'Expected Binary',
                    text: 'JustAidyn ScreenCam 1.1.1.msi',
                },
            ],
        };
    }
    getComingSoonPage(site) {
        const titles = {
            skillsminds: 'SkillsMinds',
            nofacethinker: 'NoFaceThinker',
            courses: 'Courses',
            games: 'Games',
            shop: 'Shop',
            api: 'API',
        };
        return {
            view: 'pages/coming-soon',
            title: `${titles[site]} | JustAidyn`,
            description: `${titles[site]} is being rebuilt on the new NestJS platform.`,
            pageKey: site,
            eyebrow: 'Coming Soon',
            heroTitle: `${titles[site]} is moving to the new platform.`,
            heroText: 'This subdomain is now routed through the shared NestJS baseline. The final product surface will be built incrementally on top of this shell.',
            primaryAction: { label: 'Back to Main Site', url: 'https://justaidyn.com/' },
            secondaryAction: site === 'courses'
                ? { label: 'Legacy course pages', url: 'https://courses.justaidyn.com/ai-agents-course.html' }
                : undefined,
        };
    }
};
exports.SiteService = SiteService;
exports.SiteService = SiteService = __decorate([
    (0, common_1.Injectable)()
], SiteService);
