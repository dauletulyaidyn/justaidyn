import { Injectable } from '@nestjs/common';

type SiteKey =
  | 'main'
  | 'skillsminds'
  | 'nofacethinker'
  | 'courses'
  | 'apps'
  | 'games'
  | 'shop'
  | 'api';

interface ProjectLink {
  label?: string;
  labelEn?: string;
  labelRu?: string;
  labelKk?: string;
  url: string;
  showLangs?: string;
}

interface NavLink {
  labelEn: string;
  labelRu: string;
  labelKk: string;
  url: string;
  active?: boolean;
  extraClass?: string;
  showLangs?: string;
}

export interface PageModel {
  view: string;
  title: string;
  description: string;
  pageKey: string;
  isAuthPage?: boolean;
  lowerNav: NavLink[];
  heroTitle: string;
  heroText: string;
  eyebrow?: string;
  primaryAction?: ProjectLink;
  secondaryAction?: ProjectLink;
  cards?: Array<{ title: string; text: string; href?: string; cta?: string }>;
  content?: string;
  coursePageKey?: string;
}

const ROOT_HOSTS = new Set([
  'justaidyn.com',
  'www.justaidyn.com',
  'justaidyn.local',
  'www.justaidyn.local',
  'localhost',
  '127.0.0.1',
]);

const PROJECT_LINKS: ProjectLink[] = [
  { labelEn: 'SkillsMinds', labelRu: 'SkillsMinds', labelKk: 'SkillsMinds', url: '/skillsminds' },
  { labelEn: 'NoFaceThinker', labelRu: 'NoFaceThinker', labelKk: 'NoFaceThinker', url: '/nofacethinker' },
  { labelEn: 'Courses', labelRu: 'Курсы', labelKk: 'Курстар', url: '/courses', showLangs: 'ru,kk' },
  { labelEn: 'Apps', labelRu: 'Приложения', labelKk: 'Қосымшалар', url: '/apps' },
  { labelEn: 'Games', labelRu: 'Игры', labelKk: 'Ойындар', url: '/games' },
  { labelEn: 'Shop', labelRu: 'Магазин', labelKk: 'Дүкен', url: '/shop' },
  { labelEn: 'API', labelRu: 'API', labelKk: 'API', url: '/api' },
];

@Injectable()
export class SiteService {
  resolveHost(hostname?: string): SiteKey {
    const host = (hostname || '').toLowerCase().split(':')[0];

    if (ROOT_HOSTS.has(host) || !host) {
      return 'main';
    }

    if (host === 'skillsminds.justaidyn.com' || host === 'skillsminds.justaidyn.local') return 'skillsminds';
    if (host === 'nofacethinker.justaidyn.com' || host === 'nofacethinker.justaidyn.local') return 'nofacethinker';
    if (host === 'courses.justaidyn.com' || host === 'courses.justaidyn.local') return 'courses';
    if (host === 'apps.justaidyn.com' || host === 'apps.justaidyn.local') return 'apps';
    if (host === 'games.justaidyn.com' || host === 'games.justaidyn.local') return 'games';
    if (host === 'shop.justaidyn.com' || host === 'shop.justaidyn.local') return 'shop';
    if (host === 'api.justaidyn.com' || host === 'api.justaidyn.local') return 'api';

    return 'main';
  }

  getProjects() {
    return PROJECT_LINKS;
  }

  getSubPageLowerNav(): NavLink[] {
    return [
      { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
      { labelEn: 'About', labelRu: 'Обо мне', labelKk: 'Мен туралы', url: '/#section_2' },
      { labelEn: 'Skills', labelRu: 'Навыки', labelKk: 'Дағдылар', url: '/#section_3' },
      { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '/#section_4' },
      { labelEn: 'Contact', labelRu: 'Контакты', labelKk: 'Байланыс', url: '/#section_5' },
      { labelEn: 'Posts and Articles', labelRu: 'Посты и статьи', labelKk: 'Жазбалар мен мақалалар', url: '/articles/' },
    ];
  }

  getCourseLowerNav(): NavLink[] {
    return [
      { labelEn: 'Home', labelRu: 'Главная', labelKk: 'Басты', url: '/' },
      { labelEn: 'About', labelRu: 'Обо мне', labelKk: 'Мен туралы', url: '/#section_2' },
      { labelEn: 'Skills', labelRu: 'Навыки', labelKk: 'Дағдылар', url: '/#section_3' },
      { labelEn: 'Projects', labelRu: 'Проекты', labelKk: 'Жобалар', url: '/#section_4' },
      { labelEn: 'Contact', labelRu: 'Контакты', labelKk: 'Байланыс', url: '/#section_5' },
    ];
  }

  getCoursePageModel(title: string, coursePageKey: string): PageModel {
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

  getStaticPageModel(title: string, content: string): PageModel {
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

  getLegacyFolderForSite(site: SiteKey): string | null {
    if (site === 'main') {
      return '';
    }

    if (site === 'skillsminds') return 'skillsminds';
    if (site === 'nofacethinker') return 'nofacethinker';
    if (site === 'courses') return 'courses';
    if (site === 'apps') return 'apps';
    if (site === 'games') return 'games';
    if (site === 'shop') return 'shop';
    if (site === 'api') return 'api';

    return null;
  }

  getHomePage(): PageModel {
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
      heroText:
        'This NestJS baseline becomes the single entry point for justaidyn.com and all current subdomains. Header, footer, and routing are now centralized.',
      primaryAction: { label: 'Open Projects', url: '/projects' },
      secondaryAction: { label: 'Courses', url: '/courses' },
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

  getProjectsPage(): PageModel {
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
      heroText:
        'The repo now has a central application layer and separate product surfaces. We will migrate each section incrementally into NestJS.',
      primaryAction: { label: 'Main Site', url: '/' },
      cards: PROJECT_LINKS.map((project) => ({
        title: project.label || project.labelEn || '',
        text: `Open ${project.label || project.labelEn || 'this project'} on its own subdomain.`,
        href: project.url,
        cta: 'Open',
      })),
    };
  }

  getLoginPage(): PageModel {
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
      heroTitle: 'Login to JustAidyn',
      heroText:
        'The auth layer will be shared across all projects. Initial roles are superadmin for JustAidyn and client for registered users.',
      primaryAction: { label: 'Continue with Google', url: '/login/google' },
      secondaryAction: { label: 'Continue with Apple', url: '/login/apple' },
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

  getRegisterPage(): PageModel {
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
      heroText:
        'Registration will create a client account. Superadmin remains a restricted internal role for JustAidyn only.',
      primaryAction: { label: 'Continue with Google', url: '/register/google' },
      secondaryAction: { label: 'Continue with Apple', url: '/register/apple' },
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

  getAuthProviderPage(mode: 'login' | 'register', provider: 'google' | 'apple'): PageModel {
    const isLogin = mode === 'login';
    const providerLabel = provider === 'google' ? 'Google' : 'Apple';

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
      heroTitle: `${providerLabel} ${isLogin ? 'sign in' : 'registration'} is the next backend step`,
      heroText:
        'The route is now live. The real OAuth flow will be connected after the auth backend, sessions, and provider credentials are added.',
      primaryAction: { label: isLogin ? 'Back to Login' : 'Back to Register', url: isLogin ? '/login' : '/register' },
      secondaryAction: { label: 'Main Site', url: '/' },
      cards: [
        {
          title: 'What is missing',
          text: 'Provider client credentials, callback handlers, token verification, user linking, and session storage are not wired yet.',
        },
        {
          title: 'Planned providers',
          text: 'Google OAuth and Apple Sign In will both use the central JustAidyn auth backend.',
        },
      ],
    };
  }

  getAppsPage(): PageModel {
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
      heroText:
        'Applications will move here one by one. The first route is already wired into the NestJS platform.',
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

  getCoursesLandingPage(): PageModel {
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
      heroText:
        'Course layout, navigation, and future billing flow will live here. Existing detailed course pages remain available during migration.',
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

  getScreenCamPage(): PageModel {
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
      heroText:
        'Capture workflows and download management will live here. The binary is still served from the shared downloads directory.',
      primaryAction: {
        label: 'Download EXE',
        url: '/downloads/apps/justaidyn-screencam/JustAidyn%20ScreenCam.exe',
      },
      secondaryAction: { label: 'Open Downloads Folder', url: '/downloads/apps/justaidyn-screencam/' },
      cards: [
        {
          title: 'Storage Folder',
          text: 'File source: /downloads/apps/justaidyn-screencam/',
        },
        {
          title: 'Expected Binary',
          text: 'JustAidyn ScreenCam.exe',
        },
      ],
    };
  }

  getComingSoonPage(site: Exclude<SiteKey, 'main' | 'courses'>): PageModel {
    const titles: Record<Exclude<SiteKey, 'main' | 'courses'>, string> = {
      apps: 'Apps',
      skillsminds: 'SkillsMinds',
      nofacethinker: 'NoFaceThinker',
      games: 'Games',
      shop: 'Shop',
      api: 'API',
    };

    return {
      lowerNav: [
        {
          labelEn: `${titles[site as keyof typeof titles]}`,
          labelRu: `${titles[site as keyof typeof titles]}`,
          labelKk: `${titles[site as keyof typeof titles]}`,
          url: `/${site}`,
          active: true,
        },
        { labelEn: 'Status', labelRu: 'Статус', labelKk: 'Күйі', url: `/${site}#section_2` },
      ],
      view: 'pages/coming-soon',
      title: `${titles[site as keyof typeof titles]} | JustAidyn`,
      description: '',
      pageKey: site,
      heroTitle: 'Coming Soon',
      heroText: '',
    };
  }
}
