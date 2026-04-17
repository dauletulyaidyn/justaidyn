import { Controller, Get, NotFoundException, Render, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { PageModel, SiteService } from './site.service';

@Controller()
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('/')
  @Render('pages/host-router')
  root(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);

    if (site === 'main') {
      return this.withSharedModel(this.siteService.getHomePage(), req);
    }

    if (site === 'apps') {
      return this.withSharedModel(this.siteService.getAppsPage(), req);
    }

    if (site === 'courses') {
      return this.withSharedModel(this.siteService.getCoursesLandingPage(), req);
    }

    return this.withSharedModel(this.siteService.getComingSoonPage(site), req);
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

  @Get('/justaidyn-screencam')
  @Render('pages/host-router')
  appDetail(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'apps') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getScreenCamPage(), req);
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

  @Get('/:file')
  serveLegacyFile(@Req() req: Request, @Res() res: Response) {
    const rawFile = req.params.file;
    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;
    const site = this.siteService.resolveHost(req.hostname);
    const root = process.cwd();

    if (!/\.(html|txt|xml|png)$/i.test(file)) {
      throw new NotFoundException();
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

    return res.sendFile(found);
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
