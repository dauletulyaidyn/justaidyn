import { Controller, Get, NotFoundException, Render, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PageModel, SiteService } from './site.service';

@Controller()
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('/')
  root(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);

    if (site === 'main') {
      return res.render('pages/home', this.withSharedModel(this.siteService.getHomePage(), req));
    }

    if (site === 'courses') {
      return res.render('pages/course-wrapper', this.withSharedModel(this.siteService.getCoursePageModel('JustAidyn Courses | AI Agents Course', 'course-home'), req));
    }

    return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage(site), req));
  }

  @Get('/projects')
  @Render('pages/host-router')
  projects(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getProjectsPage(), req);
  }

  @Get('/login')
  @Render('pages/host-router')
  login(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getLoginPage(), req);
  }

  @Get('/register')
  @Render('pages/host-router')
  register(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getRegisterPage(), req);
  }

  @Get('/login/google')
  @Render('pages/host-router')
  loginGoogle(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getAuthProviderPage('login', 'google'), req);
  }

  @Get('/login/apple')
  @Render('pages/host-router')
  loginApple(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getAuthProviderPage('login', 'apple'), req);
  }

  @Get('/register/google')
  @Render('pages/host-router')
  registerGoogle(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getAuthProviderPage('register', 'google'), req);
  }

  @Get('/register/apple')
  @Render('pages/host-router')
  registerApple(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getAuthProviderPage('register', 'apple'), req);
  }

  @Get('/p/:project')
  projectAlias(@Req() req: Request, @Res() res: Response) {
    const project = Array.isArray(req.params.project) ? req.params.project[0] : req.params.project;

    switch (project) {
      case 'skillsminds':
        return res.sendFile(join(process.cwd(), 'articles', 'index.html'));
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
        throw new NotFoundException();
    }
  }

  @Get('/skillsminds')
  skillsmindsProject(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'articles', 'index.html'));
  }

  @Get('/nofacethinker')
  @Render('pages/host-router')
  nofacethinkerProject(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getComingSoonPage('nofacethinker'), req);
  }

  @Get('/courses')
  coursesProject(@Req() req: Request, @Res() res: Response) {
    return res.redirect('/courses/ai-agents-course.html');
  }

  @Get('/apps')
  appsProject(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'apps', 'index.html'));
  }

  @Get('/games')
  @Render('pages/host-router')
  gamesProject(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getComingSoonPage('games'), req);
  }

  @Get('/shop')
  @Render('pages/host-router')
  shopProject(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getComingSoonPage('shop'), req);
  }

  @Get('/api')
  @Render('pages/host-router')
  apiProject(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getComingSoonPage('api'), req);
  }

  @Get('/justaidyn-screencam')
  @Render('pages/host-router')
  appDetail(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'apps') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getComingSoonPage('apps'), req);
  }

  @Get('/apps/justaidyn-screencam')
  appDetailPath(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
  }

  @Get('/p/apps/justaidyn-screencam')
  @Render('pages/host-router')
  appDetailAlias(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getComingSoonPage('apps'), req);
  }

  @Get('/ai-agents-course.html')
  @Render('pages/course-wrapper')
  aiAgentsCourse(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('JustAidyn Courses | AI Agents Course', 'course-home'), req);
  }

  @Get('/ai-agents-lite-group.html')
  @Render('pages/course-wrapper')
  aiAgentsLite(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Lite Group', 'lite-group'), req);
  }

  @Get('/ai-agents-standard-group.html')
  @Render('pages/course-wrapper')
  aiAgentsStandard(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Standard Group', 'standard-group'), req);
  }

  @Get('/ai-agents-standard-plus-group.html')
  @Render('pages/course-wrapper')
  aiAgentsStandardPlus(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Standard+ Group', 'standard-plus-group'), req);
  }

  @Get('/ai-agents-vip-group.html')
  @Render('pages/course-wrapper')
  aiAgentsVip(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | VIP Group', 'vip-group'), req);
  }

  @Get('/ai-agents-learning-steps.html')
  @Render('pages/course-wrapper')
  aiAgentsLearningSteps(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Три этапа обучения', 'learning-steps'), req);
  }

  @Get('/ai-agents-learning-principles.html')
  @Render('pages/course-wrapper')
  aiAgentsLearningPrinciples(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getCoursePageModel('AI Agents Course | Три принципа обучения', 'learning-principles'), req);
  }

  @Get('/health')
  apiHealth(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'api' && site !== 'main') {
      throw new NotFoundException();
    }

    return {
      ok: true,
      app: 'justaidyn-platform',
      host: req.hostname,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/api/health')
  apiHealthPath(@Req() req: Request) {
    return {
      ok: true,
      app: 'justaidyn-platform',
      host: req.hostname,
      timestamp: new Date().toISOString(),
    };
  }

  @Get([
    '/skillsminds/:file',
    '/nofacethinker/:file',
    '/courses/:file',
    '/apps/:file',
    '/games/:file',
    '/shop/:file',
    '/api/:file',
  ])
  serveSectionLegacyFile(@Req() req: Request, @Res() res: Response) {
    const rawSection = req.path.split('/').filter(Boolean)[0];
    const rawFile = req.params.file;
    const section = Array.isArray(rawSection) ? rawSection[0] : rawSection;
    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    const root = process.cwd();

    const sectionMap: Record<string, string> = {
      skillsminds: 'skillsminds',
      nofacethinker: 'nofacethinker',
      courses: 'courses',
      apps: 'apps',
      games: 'games',
      shop: 'shop',
      api: 'api',
    };

    if (!sectionMap[section] || !/\.(html|txt|xml|png)$/i.test(file)) {
      throw new NotFoundException();
    }

    const found = join(root, sectionMap[section], file);
    if (!existsSync(found)) {
      throw new NotFoundException();
    }

    return res.sendFile(found);
  }

  @Get('/:file')
  serveLegacyFile(@Req() req: Request, @Res() res: Response) {
    const rawFile = req.params.file;
    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    const normalizedFile = file.replace(/ /g, '+');
    const site = this.siteService.resolveHost(req.hostname);
    const root = process.cwd();

    const coursePageMap: Record<string, { title: string; key: string }> = {
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
      throw new NotFoundException();
    }

    if (site === 'main' && coursePageMap[normalizedFile]) {
      const coursePage = coursePageMap[normalizedFile];
      return res.render(
        'pages/course-wrapper',
        this.withSharedModel(this.siteService.getCoursePageModel(coursePage.title, coursePage.key), req),
      );
    }

    const siteFolder = this.siteService.getLegacyFolderForSite(site);
    const candidatePaths = [];

    if (siteFolder === '') {
      candidatePaths.push(join(root, file));
    } else if (siteFolder) {
      candidatePaths.push(join(root, siteFolder, file));
    }

    candidatePaths.push(join(root, file));

    const found = candidatePaths.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new NotFoundException();
    }

    const standalonePages = ['kaspiqr.html', 'programming-course.html'];

    if (/\.html$/i.test(file) && site === 'main' && !standalonePages.includes(file)) {
      try {
        const html = readFileSync(found, 'utf-8');
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (mainMatch) {
          const content = mainMatch[1]
            .replace(/src="images\//g, 'src="/images/')
            .replace(/href="images\//g, 'href="/images/');
          const title = titleMatch ? titleMatch[1].trim() : 'JustAidyn';
          return res.render('pages/static-wrapper', this.withSharedModel(
            this.siteService.getStaticPageModel(title, content),
            req,
          ));
        }
      } catch {
        // fallthrough to sendFile
      }
    }

    return res.sendFile(found);
  }

  @Get('/api/stats/downloads')
  getDownloadStats() {
    const countsFile = join(process.cwd(), 'data', 'download-counts.json');
    try {
      return JSON.parse(readFileSync(countsFile, 'utf-8'));
    } catch {
      return {};
    }
  }

  @Get('/track/download/apps/:app')
  trackDownload(@Req() req: Request, @Res() res: Response) {
    const app = req.params.app;
    const fileMap: Record<string, string> = {
      'justaidyn-screencam': '/downloads/apps/justaidyn-screencam/JustAidyn%20ScreenCam%201.1.1.msi',
    };

    if (!fileMap[app]) {
      throw new NotFoundException();
    }

    const countsFile = join(process.cwd(), 'data', 'download-counts.json');
    try {
      const counts = JSON.parse(readFileSync(countsFile, 'utf-8'));
      counts[app] = (counts[app] || 0) + 1;
      writeFileSync(countsFile, JSON.stringify(counts, null, 2));
    } catch {
      // don't block download if counter fails
    }

    return res.redirect(fileMap[app]);
  }

  private withSharedModel(page: PageModel, req?: Request) {
    const host = req?.hostname?.toLowerCase().split(':')[0];
    const mainSiteUrl =
      host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';

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
}
