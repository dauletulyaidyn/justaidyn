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
const ROOT_HOSTS = new Set([
    'justaidyn.com',
    'www.justaidyn.com',
    'justaidyn.local',
    'www.justaidyn.local',
    'localhost',
    '127.0.0.1',
]);
const PROJECT_LINKS = [
    { labelEn: 'Skills and Minds Hub', labelRu: 'Skills and Minds Hub', labelKk: 'Skills and Minds Hub', url: 'https://skillsminds.justaidyn.com' },
    { labelEn: 'no Face Thinker', labelRu: 'no Face Thinker', labelKk: 'no Face Thinker', url: 'https://nofacethinker.justaidyn.com' },
    { labelEn: 'Courses', labelRu: 'Курсы', labelKk: 'Курстар', url: 'https://courses.justaidyn.com', showLangs: 'ru,kk' },
    { labelEn: 'Apps', labelRu: 'Приложения', labelKk: 'Қосымшалар', url: 'https://apps.justaidyn.com' },
    { labelEn: 'Games', labelRu: 'Игры', labelKk: 'Ойындар', url: 'https://games.justaidyn.com' },
    { labelEn: 'Shop', labelRu: 'Магазин', labelKk: 'Дүкен', url: 'https://shop.justaidyn.com' },
    { labelEn: 'API', labelRu: 'API', labelKk: 'API', url: 'https://api.justaidyn.com' },
];
let SiteService = class SiteService {
    resolveHost(hostname) {
        const host = (hostname || '').toLowerCase().split(':')[0];
        if (ROOT_HOSTS.has(host) || !host) {
            return 'main';
        }
        if (host === 'skillsminds.justaidyn.com' || host === 'skillsminds.justaidyn.local')
            return 'skillsminds';
        if (host === 'nofacethinker.justaidyn.com' || host === 'nofacethinker.justaidyn.local')
            return 'nofacethinker';
        if (host === 'courses.justaidyn.com' || host === 'courses.justaidyn.local')
            return 'courses';
        if (host === 'apps.justaidyn.com' || host === 'apps.justaidyn.local')
            return 'apps';
        if (host === 'games.justaidyn.com' || host === 'games.justaidyn.local')
            return 'games';
        if (host === 'shop.justaidyn.com' || host === 'shop.justaidyn.local')
            return 'shop';
        if (host === 'api.justaidyn.com' || host === 'api.justaidyn.local')
            return 'api';
        return 'main';
    }
    getProjects() {
        return PROJECT_LINKS;
    }
    getSubPageLowerNav() {
        return [
            { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
            { labelEn: 'About', labelRu: 'Обо мне', labelKk: 'Мен туралы', url: '/#section_2' },
            { labelEn: 'Skills', labelRu: 'Навыки', labelKk: 'Дағдылар', url: '/#section_3' },
            { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '/#section_4' },
            { labelEn: 'Contact', labelRu: 'Контакты', labelKk: 'Байланыс', url: '/#section_5' },
        ];
    }
    getCourseLowerNav() {
        return [
            { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
            { labelEn: 'About', labelRu: 'Обо мне', labelKk: 'Мен туралы', url: '/#section_2' },
            { labelEn: 'Skills', labelRu: 'Навыки', labelKk: 'Дағдылар', url: '/#section_3' },
            { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '/#section_4' },
            { labelEn: 'Contact', labelRu: 'Контакты', labelKk: 'Байланыс', url: '/#section_5' },
        ];
    }
    getCoursePageModel(title, coursePageKey) {
        return {
            view: 'pages/course-wrapper',
            title,
            description: '',
            pageKey: 'course',
            lowerNav: this.getCourseLowerNav(),
            heroTitle: '',
            heroText: '',
            coursePageKey,
        };
    }
    getStaticPageModel(title, content) {
        return {
            view: 'pages/static-wrapper',
            title,
            description: '',
            pageKey: 'static',
            lowerNav: this.getSubPageLowerNav(),
            heroTitle: '',
            heroText: '',
            content,
        };
    }
    getLegacyFolderForSite(site) {
        if (site === 'main') {
            return '';
        }
        if (site === 'skillsminds')
            return 'skillsminds';
        if (site === 'nofacethinker')
            return 'nofacethinker';
        if (site === 'courses')
            return 'courses';
        if (site === 'apps')
            return 'apps';
        if (site === 'games')
            return 'games';
        if (site === 'shop')
            return 'shop';
        if (site === 'api')
            return 'api';
        return null;
    }
    getHomePage() {
        return {
            view: 'pages/home',
            title: 'JustAidyn',
            description: 'JustAidyn platform: AI engineering, products, courses, apps, and experiments.',
            pageKey: 'home',
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '#section_1', active: true, extraClass: 'click-scroll' },
                { labelEn: 'About', labelRu: 'Обо мне', labelKk: 'Мен туралы', url: '#section_2', extraClass: 'click-scroll' },
                { labelEn: 'Skills', labelRu: 'Навыки', labelKk: 'Дағдылар', url: '#section_3', extraClass: 'click-scroll' },
                { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '#section_4', extraClass: 'click-scroll' },
                { labelEn: 'Contact', labelRu: 'Контакты', labelKk: 'Байланыс', url: '#section_5', extraClass: 'click-scroll' },
            ],
            eyebrow: 'JustAidyn',
            heroTitle: 'One platform for AI products, courses, apps, and experiments.',
            heroText: 'This NestJS baseline becomes the single entry point for justaidyn.com and all current subdomains. Header, footer, and routing are now centralized.',
            primaryAction: { label: 'Open Projects', url: '/projects' },
            secondaryAction: { label: 'Courses', url: '/courses/ai-agents-course.html' },
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
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '/projects', active: true },
            ],
            eyebrow: 'Projects',
            heroTitle: 'Current JustAidyn project map.',
            heroText: 'The repo now has a central application layer and separate product surfaces. We will migrate each section incrementally into NestJS.',
            primaryAction: { label: 'Main Site', url: '/' },
            cards: PROJECT_LINKS.map((project) => ({
                title: project.label || project.labelEn || '',
                text: `Open ${project.label || project.labelEn || 'this project'} on its own subdomain.`,
                href: project.url,
                cta: 'Open',
            })),
        };
    }
    getLoginPage() {
        return {
            view: 'pages/auth',
            title: 'Login | JustAidyn',
            description: 'Sign in to JustAidyn projects and client access.',
            pageKey: 'login',
            isAuthPage: true,
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                { labelEn: 'Login', labelRu: 'Войти', labelKk: 'Кіру', url: '/login', active: true },
            ],
            eyebrow: 'Access',
            heroTitle: 'Sign in to JustAidyn',
            heroText: 'Sign in with Google. If this is your first time, JustAidyn will create a client profile automatically.',
            primaryAction: { label: 'Sign in with Google', url: '/login/google' },
            cards: [
                {
                    title: 'Role: superadmin',
                    text: 'Reserved for JustAidyn platform administration, project controls, users, billing, and releases.',
                },
                {
                    title: 'Role: client',
                    text: 'Default role for customers with access to purchased portals, apps, and future dashboards.',
                },
            ],
        };
    }
    getRegisterPage() {
        return {
            view: 'pages/auth',
            title: 'Register | JustAidyn',
            description: 'Create a JustAidyn client account.',
            pageKey: 'register',
            isAuthPage: true,
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                { labelEn: 'Register', labelRu: 'Регистрация', labelKk: 'Тіркелу', url: '/register', active: true },
            ],
            eyebrow: 'Access',
            heroTitle: 'Create a JustAidyn account',
            heroText: 'Registration uses Google OAuth and creates a client profile. Superadmin remains a restricted internal role.',
            primaryAction: { label: 'Continue with Google', url: '/register/google' },
            cards: [
                {
                    title: 'Client onboarding',
                    text: 'Client accounts are intended for portal access, app downloads, subscriptions, and dashboard usage.',
                },
                {
                    title: 'Admin boundary',
                    text: 'No public registration path should ever create a superadmin account.',
                },
            ],
        };
    }
    getProfilePage(user) {
        return {
            view: 'pages/auth',
            title: 'Profile | JustAidyn',
            description: 'JustAidyn user profile.',
            pageKey: 'profile',
            isAuthPage: true,
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                { labelEn: 'Profile', labelRu: 'Профиль', labelKk: 'Профиль', url: '/profile', active: true },
            ],
            eyebrow: 'Profile',
            eyebrowEn: 'Profile',
            eyebrowRu: 'Профиль',
            eyebrowKk: 'Профиль',
            heroTitle: user.name || user.email,
            heroText: 'Signed in with Google OAuth.',
            heroTextEn: 'Signed in with Google OAuth.',
            heroTextRu: 'Вход выполнен через Google OAuth.',
            heroTextKk: 'Google OAuth арқылы кірдіңіз.',
            primaryAction: {
                label: 'Edit Profile',
                labelEn: 'Edit Profile',
                labelRu: 'Редактировать профиль',
                labelKk: 'Профильді өңдеу',
                url: '/profile/edit',
            },
            secondaryAction: { label: 'Logout', labelEn: 'Logout', labelRu: 'Выйти', labelKk: 'Шығу', url: '/logout' },
            cards: [
                {
                    title: 'Name',
                    titleEn: 'Name',
                    titleRu: 'Имя',
                    titleKk: 'Аты',
                    text: user.firstName || user.name || user.email,
                },
                {
                    title: 'Lastname',
                    titleEn: 'Lastname',
                    titleRu: 'Фамилия',
                    titleKk: 'Тегі',
                    text: user.lastName || '-',
                },
                {
                    title: 'Email',
                    titleEn: 'Email',
                    titleRu: 'Эл. почта',
                    titleKk: 'Электрондық пошта',
                    text: user.email,
                },
                {
                    title: 'Profile title',
                    titleEn: 'Profile title',
                    titleRu: 'Обращение',
                    titleKk: 'Мәртебе',
                    text: user.profileTitle || '-',
                },
                {
                    title: 'Profile label',
                    titleEn: 'Profile label',
                    titleRu: 'Профессиональная метка',
                    titleKk: 'Кәсіби белгі',
                    text: user.profileLabel || '-',
                },
                {
                    title: 'Short bio',
                    titleEn: 'Short bio',
                    titleRu: 'Кратко о себе',
                    titleKk: 'Қысқаша өзіңіз туралы',
                    text: user.shortBio || '-',
                },
                {
                    title: 'Organization',
                    titleEn: 'Organization',
                    titleRu: 'Организация',
                    titleKk: 'Ұйым',
                    text: user.organization || '-',
                },
                {
                    title: 'Location',
                    titleEn: 'Location',
                    titleRu: 'Локация',
                    titleKk: 'Орналасуы',
                    text: user.location || '-',
                },
                {
                    title: 'Website',
                    titleEn: 'Website',
                    titleRu: 'Сайт',
                    titleKk: 'Сайт',
                    text: user.website || '-',
                    href: user.website,
                    cta: user.website ? 'Open' : undefined,
                    ctaEn: user.website ? 'Open' : undefined,
                    ctaRu: user.website ? 'Открыть' : undefined,
                    ctaKk: user.website ? 'Ашу' : undefined,
                },
            ],
        };
    }
    getProfileEditPage(user) {
        return {
            view: 'pages/auth',
            title: 'Edit Profile | JustAidyn',
            description: 'Edit JustAidyn user profile.',
            pageKey: 'profile-edit',
            isAuthPage: true,
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                { labelEn: 'Profile', labelRu: 'Профиль', labelKk: 'Профиль', url: '/profile' },
                { labelEn: 'Edit', labelRu: 'Редактировать', labelKk: 'Өңдеу', url: '/profile/edit', active: true },
            ],
            eyebrow: 'Profile',
            eyebrowEn: 'Profile',
            eyebrowRu: 'Профиль',
            eyebrowKk: 'Профиль',
            heroTitle: 'Edit profile',
            heroTitleEn: 'Edit profile',
            heroTitleRu: 'Редактирование профиля',
            heroTitleKk: 'Профильді өңдеу',
            heroText: 'Google provides your email. The optional fields below are controlled by you.',
            heroTextEn: 'Google provides your email. The optional fields below are controlled by you.',
            heroTextRu: 'Email берётся из Google. Необязательные поля ниже вы заполняете сами.',
            heroTextKk: 'Email Google арқылы алынады. Төмендегі қосымша өрістерді өзіңіз толтырасыз.',
            profileUser: user,
        };
    }
    getAuthProviderPage(mode, provider) {
        const isLogin = mode === 'login';
        const providerLabel = 'Google';
        return {
            view: 'pages/auth',
            title: `${providerLabel} ${isLogin ? 'Login' : 'Register'} | JustAidyn`,
            description: `${providerLabel} ${isLogin ? 'sign in' : 'registration'} setup for JustAidyn.`,
            pageKey: mode,
            isAuthPage: true,
            lowerNav: [
                { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
                {
                    labelEn: isLogin ? 'Login' : 'Register',
                    labelRu: isLogin ? 'Войти' : 'Регистрация',
                    labelKk: isLogin ? 'Кіру' : 'Тіркелу',
                    url: isLogin ? '/login' : '/register',
                    active: true,
                },
            ],
            eyebrow: 'OAuth',
            heroTitle: `${providerLabel} ${isLogin ? 'sign in' : 'registration'} for JustAidyn`,
            heroText: 'This route can start the desktop OAuth flow when the app passes a loopback redirect_uri and PKCE code_challenge. The browser returns the Google code to the local desktop callback.',
            primaryAction: { label: isLogin ? 'Back to Login' : 'Back to Register', url: isLogin ? '/login' : '/register' },
            secondaryAction: { label: 'Main Site', url: '/' },
            cards: [
                {
                    title: 'Desktop flow',
                    text: 'Open this route with redirect_uri=http://127.0.0.1:<port>/oauth2callback and code_challenge=<S256 challenge>. Optional state is preserved for the app.',
                },
                {
                    title: 'Provider',
                    text: 'Only Google OAuth is enabled for JustAidyn sign in and registration.',
                },
            ],
        };
    }
    getAdminLoginPage() {
        return {
            view: 'pages/auth',
            title: 'Superadmin Login | JustAidyn',
            description: 'Superadmin login for JustAidyn.',
            pageKey: 'admin-login',
            lowerNav: [{ labelEn: 'Superadmin', labelRu: 'Superadmin', labelKk: 'Superadmin', url: '/admin/login', active: true }],
            eyebrow: 'Superadmin',
            heroTitle: 'Superadmin login',
            heroText: 'Password access is restricted to the single JustAidyn superadmin account.',
        };
    }
    getAdminDashboardPage() {
        return {
            view: 'pages/auth',
            title: 'Admin | JustAidyn',
            description: 'JustAidyn superadmin dashboard.',
            pageKey: 'admin',
            lowerNav: [{ labelEn: 'Admin', labelRu: 'Admin', labelKk: 'Admin', url: '/admin', active: true }],
            eyebrow: 'Superadmin',
            heroTitle: 'JustAidyn admin',
            heroText: 'Manage users, posts, applications, games, and courses.',
            cards: [
                { title: 'Users', text: 'View registered users and roles.', href: '/admin/users', cta: 'Open' },
                { title: 'Posts', text: 'Manage Skills and Minds Hub and no Face Thinker posts.', href: '/admin/posts', cta: 'Open' },
                { title: 'Analytics', text: 'View post traffic, unique visitors, and reading time.', href: '/admin/analytics', cta: 'Open' },
                { title: 'Apps', text: 'Manage app listings and releases.', href: '/admin/apps', cta: 'Open' },
                { title: 'Games', text: 'Manage game listings and access.', href: '/admin/games', cta: 'Open' },
                { title: 'Courses', text: 'Manage course pages, groups, and schedules.', href: '/admin/courses', cta: 'Open' },
            ],
        };
    }
    getAdminUsersPage(users) {
        return {
            view: 'pages/auth',
            title: 'Admin Users | JustAidyn',
            description: 'JustAidyn user management.',
            pageKey: 'admin-users',
            lowerNav: [
                { labelEn: 'Admin', labelRu: 'Admin', labelKk: 'Admin', url: '/admin' },
                { labelEn: 'Users', labelRu: 'Users', labelKk: 'Users', url: '/admin/users', active: true },
            ],
            eyebrow: 'Superadmin',
            heroTitle: 'Users',
            heroText: 'Registered JustAidyn accounts.',
            adminUsers: users,
        };
    }
    getAdminSectionPage(section) {
        return {
            view: 'pages/auth',
            title: `Admin ${section} | JustAidyn`,
            description: `JustAidyn ${section.toLowerCase()} management.`,
            pageKey: 'admin-section',
            lowerNav: [
                { labelEn: 'Admin', labelRu: 'Admin', labelKk: 'Admin', url: '/admin' },
                { labelEn: section, labelRu: section, labelKk: section, url: `/admin/${section.toLowerCase()}`, active: true },
            ],
            eyebrow: 'Superadmin',
            heroTitle: section,
            heroText: `${section} management surface is protected and ready for editor controls.`,
            secondaryAction: { label: 'Back to Admin', url: '/admin' },
        };
    }
    getAdminPasswordResetRequestPage(resetUrl) {
        return {
            view: 'pages/auth',
            title: 'Reset Superadmin Password | JustAidyn',
            description: 'Reset superadmin password.',
            pageKey: 'admin-reset-request',
            lowerNav: [{ labelEn: 'Password reset', labelRu: 'Password reset', labelKk: 'Password reset', url: '/admin/password-reset', active: true }],
            eyebrow: 'Superadmin',
            heroTitle: 'Reset password',
            heroText: 'Password reset is restricted to aidyn.daulet@gmail.com.',
            adminResetUrl: resetUrl,
        };
    }
    getAdminPasswordResetSetPage(token) {
        return {
            view: 'pages/auth',
            title: 'Set Superadmin Password | JustAidyn',
            description: 'Set superadmin password.',
            pageKey: 'admin-reset-set',
            lowerNav: [{ labelEn: 'Password reset', labelRu: 'Password reset', labelKk: 'Password reset', url: '/admin/password-reset', active: true }],
            eyebrow: 'Superadmin',
            heroTitle: 'Set new password',
            heroText: 'Use a password of at least 12 characters.',
            content: token,
        };
    }
    getAppsPage() {
        return {
            view: 'pages/apps',
            title: 'Apps | JustAidyn',
            description: 'JustAidyn apps hub.',
            pageKey: 'apps',
            lowerNav: [
                { labelEn: 'Apps Home', labelRu: 'Главная Apps', labelKk: 'Apps басты беті', url: '/apps', active: true },
                { labelEn: 'ScreenCam', labelRu: 'ScreenCam', labelKk: 'ScreenCam', url: '/apps/justaidyn-screencam' },
            ],
            eyebrow: 'Apps',
            heroTitle: 'JustAidyn application hub.',
            heroText: 'Applications will move here one by one. The first route is already wired into the NestJS platform.',
            primaryAction: { label: 'Open ScreenCam', url: '/apps/justaidyn-screencam' },
            secondaryAction: { label: 'Back to Main Site', url: '/' },
            cards: [
                {
                    title: 'JustAidyn ScreenCam',
                    text: 'Download page, release routing, and product detail page are now ready to be migrated into the new app shell.',
                    href: '/apps/justaidyn-screencam',
                    cta: 'Open app page',
                },
                {
                    title: 'Shared Delivery Layer',
                    text: 'Installers can remain in the common downloads directory while product pages move into the NestJS surface.',
                },
            ],
        };
    }
    getCoursesLandingPage() {
        return {
            view: 'pages/courses',
            title: 'Courses | JustAidyn',
            description: 'JustAidyn Courses on the new NestJS shell.',
            pageKey: 'courses',
            lowerNav: [
                { labelEn: 'Courses Home', labelRu: 'Главная Courses', labelKk: 'Courses басты беті', url: '/courses', active: true },
                { labelEn: 'AI Agents', labelRu: 'AI-агенты', labelKk: 'AI агенттер', url: '/courses/ai-agents-course.html' },
                { labelEn: 'FAQ', labelRu: 'FAQ', labelKk: 'ЖҚС', url: '/courses/faq.html' },
            ],
            eyebrow: 'Courses',
            heroTitle: 'JustAidyn Courses is now under the shared platform shell.',
            heroText: 'Course layout, navigation, and future billing flow will live here. Existing detailed course pages remain available during migration.',
            primaryAction: { label: 'Open AI Agents Course', url: '/courses/ai-agents-course.html' },
            secondaryAction: { label: 'Open FAQ', url: '/courses/faq.html' },
            cards: [
                {
                    title: 'AI Agents Course',
                    text: 'Detailed legacy course page is still live and now accessible through the unified NestJS routing layer.',
                    href: '/courses/ai-agents-course.html',
                    cta: 'Open course',
                },
                {
                    title: 'FAQ',
                    text: 'Pricing, format, and enrollment details stay reachable while the courses area is being rebuilt.',
                    href: '/courses/faq.html',
                    cta: 'Open FAQ',
                },
                {
                    title: 'Kaspi QR',
                    text: 'The current Kaspi payment page is still wired and available through the new shell.',
                    href: '/courses/kaspiqr.html',
                    cta: 'Open payment page',
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
            lowerNav: [
                { labelEn: 'Apps Home', labelRu: 'Главная Apps', labelKk: 'Apps басты беті', url: '/apps' },
                { labelEn: 'ScreenCam', labelRu: 'ScreenCam', labelKk: 'ScreenCam', url: '/apps/justaidyn-screencam', active: true },
            ],
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
    getPostsHubPage(platform, posts) {
        const isSkills = platform === 'skillsminds';
        return {
            lowerNav: [{ labelEn: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', labelRu: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', labelKk: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', url: `/${platform}`, active: true }],
            view: 'pages/posts-hub',
            title: isSkills ? 'Skills and Minds Hub | JustAidyn' : 'no Face Thinker | JustAidyn',
            description: isSkills ? 'Free articles and posts for registered users.' : 'Exclusive posts for Thinker subscribers.',
            pageKey: 'posts-hub',
            heroTitle: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker',
            heroText: '',
            platform,
            posts,
        };
    }
    getThinkerPaywallPage() {
        return {
            lowerNav: [{ labelEn: 'no Face Thinker', labelRu: 'no Face Thinker', labelKk: 'no Face Thinker', url: '/nofacethinker', active: true }],
            view: 'pages/posts-hub',
            title: 'no Face Thinker | JustAidyn',
            description: 'Exclusive posts for Thinker subscribers.',
            pageKey: 'posts-hub',
            heroTitle: 'no Face Thinker',
            heroText: '',
            platform: 'nofacethinker',
            posts: [],
            isPaywall: true,
            thinkerPriceId: 'pri_01kq8ty439m33xebxp8hjy9ar9',
        };
    }
    getPostDetailPage(post, isPreview = false) {
        const platform = post.platform;
        const isSkills = platform === 'skillsminds';
        return {
            lowerNav: [
                { labelEn: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', labelRu: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', labelKk: isSkills ? 'Skills and Minds Hub' : 'no Face Thinker', url: `/${platform}` },
                { labelEn: post.title, labelRu: post.title, labelKk: post.title, url: `/${platform}/post/${post.slug}`, active: true },
            ],
            view: 'pages/post-detail',
            title: `${post.title} | JustAidyn`,
            description: post.excerpt,
            pageKey: 'post-detail',
            heroTitle: post.title,
            heroText: post.excerpt,
            platform,
            post,
            isPaywall: isPreview,
        };
    }
    getThinkerPreviewListPage(posts) {
        return {
            lowerNav: [{ labelEn: 'no Face Thinker', labelRu: 'no Face Thinker', labelKk: 'no Face Thinker', url: '/nofacethinker', active: true }],
            view: 'pages/posts-hub',
            title: 'no Face Thinker | JustAidyn',
            description: 'Exclusive posts for Thinker subscribers. Subscribe to get full access.',
            pageKey: 'posts-hub',
            heroTitle: 'no Face Thinker',
            heroText: '',
            platform: 'nofacethinker',
            posts,
            isPaywall: true,
            thinkerPriceId: 'pri_01kq8ty439m33xebxp8hjy9ar9',
        };
    }
    getAdminPostsPage(posts) {
        return {
            lowerNav: [{ labelEn: 'Admin', labelRu: 'Admin', labelKk: 'Admin', url: '/admin' }, { labelEn: 'Posts', labelRu: 'Posts', labelKk: 'Posts', url: '/admin/posts', active: true }],
            view: 'pages/admin-posts',
            title: 'Posts | Admin | JustAidyn',
            description: 'Manage posts.',
            pageKey: 'admin-posts',
            heroTitle: 'Posts',
            heroText: '',
            posts,
        };
    }
    getAdminPostFormPage(post, platform) {
        return {
            lowerNav: [{ labelEn: 'Admin', labelRu: 'Admin', labelKk: 'Admin', url: '/admin' }, { labelEn: 'Posts', labelRu: 'Posts', labelKk: 'Posts', url: '/admin/posts' }, { labelEn: post ? 'Edit' : 'New', labelRu: post ? 'Edit' : 'New', labelKk: post ? 'Edit' : 'New', url: '#', active: true }],
            view: 'pages/admin-post-form',
            title: `${post ? 'Edit' : 'New'} Post | Admin | JustAidyn`,
            description: 'Post form.',
            pageKey: 'admin-post-form',
            heroTitle: post ? 'Edit Post' : 'New Post',
            heroText: '',
            editPost: post,
            postPlatform: post?.platform ?? platform,
        };
    }
    getComingSoonPage(site) {
        const titles = {
            apps: 'Apps',
            skillsminds: 'Skills and Minds Hub',
            nofacethinker: 'no Face Thinker',
            games: 'Games',
            shop: 'Shop',
            api: 'API',
        };
        return {
            lowerNav: [
                {
                    labelEn: `${titles[site]}`,
                    labelRu: `${titles[site]}`,
                    labelKk: `${titles[site]}`,
                    url: `/${site}`,
                    active: true,
                },
                { labelEn: 'Status', labelRu: 'Статус', labelKk: 'Күйі', url: `/${site}#section_2` },
            ],
            view: 'pages/coming-soon',
            title: `${titles[site]} | JustAidyn`,
            description: '',
            pageKey: site,
            heroTitle: 'Coming Soon',
            heroText: '',
        };
    }
};
exports.SiteService = SiteService;
exports.SiteService = SiteService = __decorate([
    (0, common_1.Injectable)()
], SiteService);
