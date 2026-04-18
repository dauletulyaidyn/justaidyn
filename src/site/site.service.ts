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
  label: string;
  url: string;
}

export interface PageModel {
  view: string;
  title: string;
  description: string;
  pageKey: string;
  heroTitle: string;
  heroText: string;
  eyebrow?: string;
  primaryAction?: ProjectLink;
  secondaryAction?: ProjectLink;
  cards?: Array<{ title: string; text: string; href?: string; cta?: string }>;
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
  { label: 'SkillsMinds', url: 'https://skillsminds.justaidyn.com/' },
  { label: 'NoFaceThinker', url: 'https://nofacethinker.justaidyn.com/' },
  { label: 'Courses', url: 'https://courses.justaidyn.com/' },
  { label: 'Apps', url: 'https://apps.justaidyn.com/' },
  { label: 'Games', url: 'https://games.justaidyn.com/' },
  { label: 'Shop', url: 'https://shop.justaidyn.com/' },
  { label: 'API', url: 'https://api.justaidyn.com/' },
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
      eyebrow: 'JustAidyn',
      heroTitle: 'One platform for AI products, courses, apps, and experiments.',
      heroText:
        'This NestJS baseline becomes the single entry point for justaidyn.com and all current subdomains. Header, footer, and routing are now centralized.',
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

  getProjectsPage(): PageModel {
    return {
      view: 'pages/projects',
      title: 'Projects | JustAidyn',
      description: 'Current JustAidyn projects and subdomains.',
      pageKey: 'projects',
      eyebrow: 'Projects',
      heroTitle: 'Current JustAidyn project map.',
      heroText:
        'The repo now has a central application layer and separate product surfaces. We will migrate each section incrementally into NestJS.',
      primaryAction: { label: 'Main Site', url: '/' },
      cards: PROJECT_LINKS.map((project) => ({
        title: project.label,
        text: `Open ${project.label} on its own subdomain.`,
        href: project.url,
        cta: 'Open',
      })),
    };
  }

  getAppsPage(): PageModel {
    return {
      view: 'pages/apps',
      title: 'Apps | JustAidyn',
      description: 'JustAidyn apps hub.',
      pageKey: 'apps',
      eyebrow: 'Apps',
      heroTitle: 'JustAidyn application hub.',
      heroText:
        'Applications will move here one by one. The first route is already wired into the NestJS platform.',
      primaryAction: { label: 'Open ScreenCam', url: '/justaidyn-screencam' },
      secondaryAction: { label: 'Back to Main Site', url: 'https://justaidyn.com/' },
      cards: [
        {
          title: 'JustAidyn ScreenCam',
          text: 'Download page, release routing, and product detail page are now ready to be migrated into the new app shell.',
          href: '/justaidyn-screencam',
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
      eyebrow: 'Courses',
      heroTitle: 'JustAidyn Courses is now under the shared platform shell.',
      heroText:
        'Course layout, navigation, and future billing flow will live here. Existing detailed course pages remain available during migration.',
      primaryAction: { label: 'Open AI Agents Course', url: '/ai-agents-course.html' },
      secondaryAction: { label: 'Open FAQ', url: '/faq.html' },
      cards: [
        {
          title: 'AI Agents Course',
          text: 'Detailed legacy course page is still live and now accessible through the unified NestJS routing layer.',
          href: '/ai-agents-course.html',
          cta: 'Open course',
        },
        {
          title: 'FAQ',
          text: 'Pricing, format, and enrollment details stay reachable while the courses area is being rebuilt.',
          href: '/faq.html',
          cta: 'Open FAQ',
        },
        {
          title: 'Kaspi QR',
          text: 'The current Kaspi payment page is still wired and available through the new shell.',
          href: '/kaspiqr.html',
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

  getComingSoonPage(site: SiteKey): PageModel {
    const titles: Record<Exclude<SiteKey, 'main' | 'apps'>, string> = {
      skillsminds: 'SkillsMinds',
      nofacethinker: 'NoFaceThinker',
      courses: 'Courses',
      games: 'Games',
      shop: 'Shop',
      api: 'API',
    };

    return {
      view: 'pages/coming-soon',
      title: `${titles[site as keyof typeof titles]} | JustAidyn`,
      description: `${titles[site as keyof typeof titles]} is being rebuilt on the new NestJS platform.`,
      pageKey: site,
      eyebrow: 'Coming Soon',
      heroTitle: `${titles[site as keyof typeof titles]} is moving to the new platform.`,
      heroText:
        'This subdomain is now routed through the shared NestJS baseline. The final product surface will be built incrementally on top of this shell.',
      primaryAction: { label: 'Back to Main Site', url: 'https://justaidyn.com/' },
      secondaryAction:
        site === 'courses'
          ? { label: 'Legacy course pages', url: 'https://courses.justaidyn.com/ai-agents-course.html' }
          : undefined,
    };
  }
}
