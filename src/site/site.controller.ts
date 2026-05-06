import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Render, Req, Res, UnauthorizedException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { PageModel, SiteService } from './site.service';
import { PostService } from './post.service';
import { AppCatalogService } from './app-catalog.service';

const { diskStorage } = require('multer');
const installerUpload = {
  storage: diskStorage({
    destination: (_req: Request, _file: unknown, cb: (error: Error | null, destination: string) => void) => {
      const dir = join(process.cwd(), 'tmp', 'uploads');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 1024 },
};

type AdminAnalyticsSection = 'hub' | 'skillsminds' | 'nofacethinker' | 'games' | 'apps' | 'courses';

@Controller()
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly authService: AuthService,
    private readonly postService: PostService,
    private readonly analyticsService: AnalyticsService,
    private readonly appCatalogService: AppCatalogService,
  ) {}

  @Get('/')
  async root(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);

    if (site === 'main') {
      return res.render('pages/home', this.withSharedModel(this.siteService.getHomePage(), req));
    }
    if (site === 'courses') {
      this.trackPageView(req, 'courses', 'ai-agents-course.html', 'JustAidyn Courses | AI Agents Course');
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
      this.trackPageView(req, 'apps', 'apps-hub', 'Apps Hub');
      return res.render('pages/apps-landing', this.withSharedModel(this.getAppsLandingPage(), req));
    }
    if (site === 'shop') {
      return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'shop', 'index.html'));
    }

    return res.render('pages/host-router', this.withSharedModel(this.siteService.getComingSoonPage(site), req));
  }

  @Get('/projects')
  @Render('pages/host-router')
  projects(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      return this.toMainSite(req, res, '/projects');
    }

    return this.withSharedModel(this.siteService.getProjectsPage(), req);
  }

  @Get('/login')
  login(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      return this.toMainSite(req, res, '/login');
    }

    return res.render('pages/host-router', this.withSharedModel(this.siteService.getLoginPage(), req));
  }

  @Get('/admin/login')
  @Render('pages/host-router')
  adminLogin(@Req() req: Request) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    return this.withSharedModel(this.siteService.getAdminLoginPage(), req);
  }

  @Post('/admin/login')
  async adminLoginPost(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    await this.authService.loginSuperadmin(req, res, body.email, body.password);
    return res.redirect('/admin');
  }

  @Get('/admin/password-reset')
  @Render('pages/host-router')
  adminPasswordReset(@Req() req: Request) {
    return this.withSharedModel(this.siteService.getAdminPasswordResetRequestPage(), req);
  }

  @Post('/admin/password-reset')
  async adminPasswordResetPost(@Req() req: Request, @Body() body: Record<string, string>) {
    const result = await this.authService.requestSuperadminPasswordReset(req, body.email);
    return this.withSharedModel(this.siteService.getAdminPasswordResetRequestPage(result.resetUrl), req);
  }

  @Get('/admin/password-reset/:token')
  @Render('pages/host-router')
  adminPasswordResetSet(@Req() req: Request, @Param('token') token: string) {
    return this.withSharedModel(this.siteService.getAdminPasswordResetSetPage(token), req);
  }

  @Post('/admin/password-reset/:token')
  async adminPasswordResetSetPost(@Req() req: Request, @Res() res: Response, @Param('token') token: string, @Body() body: Record<string, string>) {
    await this.authService.resetSuperadminPassword(token, body.password);
    return res.redirect('/admin/login');
  }

  @Get('/admin')
  adminDashboard(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) {
      return;
    }

    return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminDashboardPage(), req));
  }

  @Get('/admin/users')
  async adminUsers(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    const users = await this.authService.listUsersForSuperadmin(req);
    return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminUsersPage(users), req));
  }

  @Get('/admin/posts')
  async adminPosts(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    const posts = await this.postService.listAll();
    return res.render('pages/admin-posts', this.withSharedModel(this.siteService.getAdminPostsPage(posts), req));
  }

  @Get('/admin/analytics')
  async adminAnalytics(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    return this.renderAdminAnalytics(req, res, 'hub');
  }

  @Get('/admin/analytics/:section')
  async adminAnalyticsSection(@Req() req: Request, @Res() res: Response, @Param('section') section: string) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    const allowed = ['skillsminds', 'nofacethinker', 'games', 'apps', 'courses'];
    if (!allowed.includes(section)) throw new NotFoundException();
    return this.renderAdminAnalytics(req, res, section as AdminAnalyticsSection);
  }

  @Get('/admin/posts/new')
  adminPostNew(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    const platform = (req.query.platform as string) || 'skillsminds';
    return res.render('pages/admin-post-form', this.withSharedModel(this.siteService.getAdminPostFormPage(null, platform), req));
  }

  @Post('/admin/posts/new')
  async adminPostCreate(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    if (!this.tryRequireSuperadmin(req, res)) return;
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

  @Get('/admin/posts/:id/edit')
  async adminPostEdit(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    const post = await this.postService.getById(id);
    return res.render('pages/admin-post-form', this.withSharedModel(this.siteService.getAdminPostFormPage(post, post.platform), req));
  }

  @Post('/admin/posts/:id/edit')
  async adminPostUpdate(@Req() req: Request, @Res() res: Response, @Param('id') id: string, @Body() body: Record<string, string>) {
    if (!this.tryRequireSuperadmin(req, res)) return;
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

  @Post('/admin/posts/:id/delete')
  async adminPostDelete(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    await this.postService.delete(id);
    return res.redirect('/admin/posts');
  }

  @Get('/admin/apps')
  adminApps(@Req() req: Request, @Res() res: Response) {
    if (!this.tryRequireSuperadmin(req, res)) return;
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

  @Get('/admin/apps/:slug/edit')
  adminAppEdit(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    if (!this.tryRequireSuperadmin(req, res)) return;
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

  @Post('/admin/apps/save')
  adminAppSave(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    if (!this.tryRequireSuperadmin(req, res)) return;
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

  @Post('/admin/apps/:slug/upload')
  @UseInterceptors(FileInterceptor('installer', installerUpload))
  adminAppUpload(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string, @UploadedFile() file: any) {
    if (!this.tryRequireSuperadmin(req, res)) return;
    this.appCatalogService.attachInstaller(slug, file);
    return res.redirect(`/admin/apps/${slug}/edit`);
  }

  @Get('/admin/games')
  adminGames(@Req() req: Request, @Res() res: Response) {
    return this.renderAdminSection(req, res, 'Games');
  }

  @Get('/admin/courses')
  adminCourses(@Req() req: Request, @Res() res: Response) {
    return this.renderAdminSection(req, res, 'Courses');
  }

  @Get('/register')
  register(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      return this.toMainSite(req, res, '/login');
    }

    return res.redirect('/login');
  }

  @Get('/login/google')
  async loginGoogle(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      return this.toMainSite(req, res, '/login/google');
    }

    // Desktop PKCE flow: redirect_uri + code_challenge present → OAuth via justaidyn.com callback
    const redirectUri   = this.getQueryValue(req.query.redirect_uri);
    const codeChallenge = this.getQueryValue(req.query.code_challenge);
    if (redirectUri || codeChallenge) {
      if (!redirectUri || !codeChallenge) {
        throw new BadRequestException('Desktop OAuth requires both redirect_uri and code_challenge.');
      }
      const parsedUri = this.parseDesktopRedirectUri(redirectUri);
      if (!parsedUri) {
        throw new BadRequestException('redirect_uri must be http://127.0.0.1:<port>/oauth2callback or http://localhost:<port>/oauth2callback.');
      }
      if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeChallenge)) {
        throw new BadRequestException('code_challenge must be a valid PKCE S256 challenge.');
      }
      const authUrl = await this.authService.buildGoogleWebAuthUrlForDesktop(req, res, 'login', parsedUri.toString(), codeChallenge);
      this.authService.setOAuthStateCookie(res, authUrl, req);
      return res.redirect(authUrl);
    }

    // Web flow: optional ?return= redirect after login
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

  @Get('/profile')
  profile(@Req() req: Request, @Res() res: Response) {
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

  @Get('/profile/edit')
  profileEdit(@Req() req: Request, @Res() res: Response) {
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

  @Post('/profile/edit')
  async profileUpdate(@Req() req: Request, @Res() res: Response, @Body() body: Record<string, string>) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
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

  @Post('/profile/delete')
  async profileDelete(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    await this.authService.deleteCurrentUser(req, res);
    return res.redirect('/');
  }

  @Get('/register/google')
  registerGoogle(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      return this.toMainSite(req, res, '/login/google');
    }

    return res.redirect('/login/google');
  }

  @Get('/auth/google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
    }

    const { user, desktopRedirectUri } = await this.authService.handleGoogleCallback(req, res);

    // Desktop flow: generate OTC and redirect to app's loopback
    if (desktopRedirectUri) {
      const codeChallenge = this.authService.readDesktopChallengeCookie(req, res);
      if (!codeChallenge) {
        return res.render('pages/desktop-success', { success: false, error: 'Session expired. Please try again.' });
      }
      const otcToken = await this.authService.createDesktopOtc(user.id, desktopRedirectUri, codeChallenge);
      return res.redirect(`${desktopRedirectUri}?token=${otcToken}`);
    }

    // Web flow: return to saved URL or profile
    const returnUrl = (req as any).cookies?.ja_return_url;
    res.clearCookie('ja_return_url', { path: '/' });
    const safeReturn = this.safeLocalReturnPath(returnUrl) || '/profile';
    return res.redirect(safeReturn);
  }

  @Post('/api/desktop/token')
  async desktopToken(@Req() req: Request, @Body() body: Record<string, string>) {
    const { token, codeVerifier } = body;
    if (!token || !codeVerifier) {
      throw new BadRequestException('token and codeVerifier are required.');
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

  @Get('/api/desktop/session')
  async desktopSession(@Req() req: Request) {
    return this.authService.checkDesktopSession(req);
  }

  @Post('/api/analytics/post-view/start')
  async analyticsPostViewStart(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const user = this.authService.getCurrentUser(req);
    return this.analyticsService.startPostView(req, body, user?.id);
  }

  @Post('/api/analytics/post-view/heartbeat')
  async analyticsPostViewHeartbeat(@Body() body: Record<string, unknown>) {
    return this.analyticsService.heartbeatPostView(body);
  }

  @Get('/api/me')
  async apiMe(@Req() req: Request) {
    // Web session takes priority, then Bearer token (desktop)
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

  @Get('/desktop-success')
  desktopSuccess(@Res() res: Response) {
    return res.render('pages/desktop-success', { success: true });
  }

  @Get('/privacy')
  privacy(@Req() req: Request, @Res() res: Response) {
    return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'privacy.html'));
  }

  @Get('/privacy.html')
  privacyHtml(@Req() req: Request, @Res() res: Response) {
    return res.redirect(301, '/privacy');
  }

  @Get('/terms')
  terms(@Req() req: Request, @Res() res: Response) {
    return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'terms.html'));
  }

  @Get('/terms.html')
  termsHtml(@Req() req: Request, @Res() res: Response) {
    return res.redirect(301, '/terms');
  }

  @Get('/refunds')
  refunds(@Req() req: Request, @Res() res: Response) {
    return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'refunds.html'));
  }

  @Get('/refunds.html')
  refundsHtml(@Req() req: Request, @Res() res: Response) {
    return res.redirect(301, '/refunds');
  }

  @Get('/logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.authService.logout(req, res);
    return res.redirect('/');
  }

  @Get('/p/:project')
  projectAlias(@Req() req: Request, @Res() res: Response) {
    const project = Array.isArray(req.params.project) ? req.params.project[0] : req.params.project;

    switch (project) {
      case 'skillsminds':
        return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'articles', 'index.html'));
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
        throw new NotFoundException();
    }
  }

  @Get('/skillsminds')
  async skillsmindsProject(@Req() req: Request, @Res() res: Response) {
    const posts = await this.postService.listPublished('skillsminds');
    return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('skillsminds', posts), req));
  }

  @Get('/skillsminds/post/:slug')
  async skillsmindsPost(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const post = await this.postService.getBySlug('skillsminds', slug);
    return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post), req));
  }

  @Get('/programming/:file')
  programmingArticleShortcut(@Req() req: Request, @Res() res: Response) {
    const rawFile = req.params.file;
    const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;

    if (!/\.html$/i.test(file)) {
      throw new NotFoundException();
    }

    const found = join(process.cwd(), 'articles', 'programming', file);
    if (!existsSync(found)) {
      throw new NotFoundException();
    }

    return res.redirect(301, `/articles/programming/${file}`);
  }

  @Get('/nofacethinker')
  async nofacethinkerProject(@Req() req: Request, @Res() res: Response) {
    const user = this.authService.getCurrentUser(req);
    const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
    const posts = await this.postService.listPublished('nofacethinker');
    if (!isSubscribed) {
      return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getThinkerPreviewListPage(posts), req));
    }
    return res.render('pages/posts-hub', this.withSharedModel(this.siteService.getPostsHubPage('nofacethinker', posts), req));
  }

  @Get('/nofacethinker/post/:slug')
  async nofacethinkerPost(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const user = this.authService.getCurrentUser(req);
    const isSubscribed = user && (user.thinkerSubscriptionStatus === 'active' || user.thinkerSubscriptionStatus === 'trialing');
    const post = await this.postService.getBySlug('nofacethinker', slug);
    if (!isSubscribed) {
      return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post, true), req));
    }
    return res.render('pages/post-detail', this.withSharedModel(this.siteService.getPostDetailPage(post, false), req));
  }

  @Get('/post/:slug')
  async subdomainPost(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
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

    throw new NotFoundException();
  }

  @Get('/courses')
  coursesProject(@Req() req: Request, @Res() res: Response) {
    return res.redirect('/courses/ai-agents-course.html');
  }

  @Get('/apps')
  appsProject(@Req() req: Request, @Res() res: Response) {
    this.trackPageView(req, 'apps', 'apps-hub', 'Apps Hub');
    return res.render('pages/apps-landing', this.withSharedModel(this.getAppsLandingPage(), req));
  }

  @Get('/games')
  @Render('pages/host-router')
  gamesProject(@Req() req: Request) {
    this.trackPageView(req, 'games', 'games-hub', 'Games Hub');
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

  @Get(['/justaidyn-screencam', '/justaidyn-screencam/'])
  appDetail(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'apps') {
      throw new NotFoundException();
    }

    this.trackPageView(req, 'apps', 'justaidyn-screencam', 'JustAidyn ScreenCam');
    return res.sendFile(join(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
  }

  @Get(['/apps/justaidyn-screencam', '/apps/justaidyn-screencam/'])
  appDetailPath(@Req() req: Request, @Res() res: Response) {
    this.trackPageView(req, 'apps', 'justaidyn-screencam', 'JustAidyn ScreenCam');
    return res.sendFile(join(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
  }

  @Get('/p/apps/justaidyn-screencam')
  appDetailAlias(@Res() res: Response) {
    return res.redirect(301, '/apps/justaidyn-screencam');
  }

  @Get('/apps/:slug')
  dynamicAppDetail(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const app = this.appCatalogService.getPublished(slug);
    this.trackPageView(req, 'apps', app.slug, app.name);
    return res.render('pages/app-detail', this.withSharedModel(this.getAppDetailPage(app), req));
  }

  @Get('/ai-agents-course.html')
  aiAgentsCourse(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-course.html');
  }

  @Get('/ai-agents-lite-group.html')
  aiAgentsLite(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-lite-group.html');
  }

  @Get('/ai-agents-standard-group.html')
  aiAgentsStandard(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-standard-group.html');
  }

  @Get('/ai-agents-standard-plus-group.html')
  aiAgentsStandardPlus(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-standard-plus-group.html');
  }

  @Get('/ai-agents-vip-group.html')
  aiAgentsVip(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-vip-group.html');
  }

  @Get('/ai-agents-learning-steps.html')
  aiAgentsLearningSteps(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-learning-steps.html');
  }

  @Get('/ai-agents-learning-principles.html')
  aiAgentsLearningPrinciples(@Res() res: Response) {
    return res.redirect(301, '/courses/ai-agents-learning-principles.html');
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

  // ─── Desktop version endpoints ────────────────────────────────────────────────

  private get desktopVersionPath() {
    return join(process.cwd(), 'desktop-version.json');
  }

  private readDesktopVersion(): Record<string, unknown> {
    if (!existsSync(this.desktopVersionPath)) {
      return { version: '0.0.0', minVersion: '0.0.0', downloadUrl: '', releaseNotes: '', required: false };
    }
    try {
      return JSON.parse(readFileSync(this.desktopVersionPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('desktop-version.json is malformed.');
    }
  }

  @Get('/api/version/desktop')
  getDesktopVersion() {
    return this.readDesktopVersion();
  }

  @Post('/api/admin/version/desktop')
  setDesktopVersion(@Req() req: Request, @Body() body: Record<string, unknown>) {
    this.authService.getSuperadminUser(req);
    const version = typeof body.version === 'string' ? body.version.trim() : '';
    const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl.trim() : '';
    const releaseNotes = typeof body.releaseNotes === 'string' ? body.releaseNotes.trim() : '';
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      throw new BadRequestException('version must be in format X.Y.Z');
    }
    if (!downloadUrl) throw new BadRequestException('downloadUrl is required.');
    const data = {
      version,
      minVersion: version,  // no downgrade: minVersion always equals version
      downloadUrl,
      releaseNotes,
      required: true,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.desktopVersionPath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  }

  @Post('/api/paddle/thinker/verify-checkout')
  async paddleThinkerVerifyCheckout(@Req() req: Request) {
    const user = await this.authService.verifyThinkerCheckoutAndSave(req);
    return { subscriptionStatus: user.thinkerSubscriptionStatus, subscribedAt: user.thinkerSubscribedAt };
  }

  @Post('/api/paddle/thinker/cancel')
  async paddleThinkerCancel(@Req() req: Request) {
    await this.authService.cancelThinkerSubscription(req);
    return { canceled: true };
  }

  @Get('/sitemap.xml')
  async sitemap(@Res() res: Response) {
    const base = 'https://justaidyn.com';
    const [skillsPosts, thinkerPosts] = await Promise.all([
      this.postService.listPublished('skillsminds'),
      this.postService.listPublished('nofacethinker'),
    ]);
    const staticUrls: { loc: string; priority: string; changefreq: string; lastmod?: string }[] = [
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

  @Post('/api/paddle/webhook')
  async paddleWebhook(@Req() req: Request, @Body() body: Record<string, unknown>, @Res() res: Response) {
    try {
      this.authService.verifyPaddleWebhookSignature(
        this.getHeaderValue(req.headers['paddle-signature']),
        (req as Request & { rawBody?: Buffer }).rawBody,
      );
      await this.authService.handlePaddleWebhook(body);
      return res.status(200).json({ received: true });
    } catch {
      // never reject — Paddle retries on non-2xx
    }
    return res.status(401).json({ received: false });
  }

  @Post('/api/paddle/verify-checkout')
  async paddleVerifyCheckout(@Req() req: Request) {
    const user = await this.authService.verifyCheckoutAndSave(req);
    return {
      subscriptionStatus: user.paddleSubscriptionStatus,
      subscribedAt: user.paddleSubscribedAt,
    };
  }

  @Post('/api/paddle/subscription/cancel')
  async paddleCancelSubscription(@Req() req: Request) {
    await this.authService.cancelUserSubscription(req);
    return { canceled: true };
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

    if (section === 'courses' && /\.html$/i.test(file)) {
      const coursePageMap: Record<string, { title: string; key: string }> = {
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
        this.trackPageView(req, 'courses', file.replace(/ /g, '+'), coursePage.title);
        return res.render(
          'pages/course-wrapper',
          this.withSharedModel(this.siteService.getCoursePageModel(coursePage.title, coursePage.key), req),
        );
      }
    }

    const found = join(root, sectionMap[section], file);
    if (!existsSync(found)) {
      throw new NotFoundException();
    }

    if (/\.html$/i.test(file)) {
      if (section === 'apps') this.trackPageView(req, 'apps', file.replace(/\.html$/i, ''), file);
      if (section === 'games') this.trackPageView(req, 'games', file.replace(/\.html$/i, ''), file);
      return this.renderStaticHtmlFile(req, res, found);
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

    if ((site === 'main' || site === 'courses') && coursePageMap[normalizedFile]) {
      const coursePage = coursePageMap[normalizedFile];
      this.trackPageView(req, 'courses', normalizedFile, coursePage.title);
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
      return this.renderStaticHtmlFile(req, res, found);
    }

    return res.sendFile(found);
  }

  @Get('/api/stats/downloads')
  getDownloadStats() {
    return this.readDownloadCounts();
  }

  @Get('/track/download/apps/:app')
  async trackDownload(@Param('app') app: string, @Req() req: Request, @Res() res: Response) {
    const countsFile = join(process.cwd(), 'data', 'download-counts.json');
    try {
      const counts = JSON.parse(readFileSync(countsFile, 'utf-8'));
      counts[app] = (counts[app] || 0) + 1;
      writeFileSync(countsFile, JSON.stringify(counts, null, 2));
    } catch {
      // don't block download if counter fails
    }

    try {
      const user = this.authService.getCurrentUser(req) ?? await this.authService.verifyBearerToken(req);
      await this.analyticsService.recordDownload(req, app, user?.id);
    } catch {
      // don't block download if analytics fails
    }

    return res.redirect(this.appCatalogService.getDownloadUrl(app));
  }

  private getAppsLandingPage(): PageModel {
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

  private trackPageView(req: Request, section: 'apps' | 'games' | 'courses', entitySlug: string, entityTitle: string) {
    try {
      const user = this.authService.getCurrentUser(req);
      void this.analyticsService.recordPageView(req, { section, entitySlug, entityTitle }, user?.id).catch(() => {});
    } catch {
      // Analytics should never block public pages.
    }
  }

  private async renderAdminAnalytics(req: Request, res: Response, section: AdminAnalyticsSection) {
    const dashboard = await this.analyticsService.getDashboard();
    const nav = [
      { label: 'Overview', href: '/admin/analytics', active: section === 'hub' },
      { label: 'Skills and Minds Hub', href: '/admin/analytics/skillsminds', active: section === 'skillsminds' },
      { label: 'no Face Thinker', href: '/admin/analytics/nofacethinker', active: section === 'nofacethinker' },
      { label: 'Games', href: '/admin/analytics/games', active: section === 'games' },
      { label: 'Apps', href: '/admin/analytics/apps', active: section === 'apps' },
      { label: 'Courses', href: '/admin/analytics/courses', active: section === 'courses' },
    ];
    const sections = dashboard.sections;
    const current = this.buildAdminAnalyticsSection(section, dashboard, sections);
    const page = {
      ...this.siteService.getAdminSectionPage('Posts'),
      title: `${current.title} | Analytics | Admin | JustAidyn`,
      pageKey: 'admin-analytics',
      heroTitle: current.title,
      heroText: current.description,
    };
    return res.render('pages/admin-analytics', {
      ...this.withSharedModel(page, req),
      analytics: {
        ...dashboard,
        nav,
        current,
      },
    });
  }

  private buildAdminAnalyticsSection(section: AdminAnalyticsSection, dashboard: any, sections: any) {
    if (section === 'skillsminds') {
      return {
        type: 'posts',
        isPosts: true,
        title: 'Skills and Minds Hub',
        description: 'Separate post analytics for Skills and Minds Hub.',
        totals: sections.skillsminds.totals,
        posts: sections.skillsminds.posts,
        recentViews: dashboard.recentViews.filter((view: { url: string }) => view.url.startsWith('/skillsminds/')),
        daily: dashboard.daily,
      };
    }
    if (section === 'nofacethinker') {
      return {
        type: 'posts',
        isPosts: true,
        title: 'no Face Thinker',
        description: 'Separate post analytics for no Face Thinker.',
        totals: sections.nofacethinker.totals,
        posts: sections.nofacethinker.posts,
        recentViews: dashboard.recentViews.filter((view: { url: string }) => view.url.startsWith('/nofacethinker/')),
        daily: dashboard.daily,
      };
    }
    if (section === 'games') {
      return {
        type: 'pages',
        isPages: true,
        title: 'Games',
        description: 'Separate page analytics for games.',
        itemLabel: 'Game',
        emptyText: 'No game views yet.',
        totals: sections.games.totals,
        items: sections.games.items,
      };
    }
    if (section === 'apps') {
      return {
        type: 'apps',
        isApps: true,
        title: 'Apps',
        description: 'Software analytics with views, unique visitors, downloads, and IPs per app.',
        totals: sections.apps.totals,
        items: sections.apps.items,
        recentDownloads: dashboard.downloads.recent,
      };
    }
    if (section === 'courses') {
      return {
        type: 'pages',
        isPages: true,
        title: 'Courses',
        description: 'Separate page analytics for every course page.',
        itemLabel: 'Course',
        emptyText: 'No course views yet.',
        totals: sections.courses.totals,
        items: sections.courses.items,
      };
    }
    return {
      type: 'hub',
      isHub: true,
      title: 'Analytics',
      description: 'Choose a separate analytics page for each JustAidyn area.',
      cards: [
        {
          title: 'Skills and Minds Hub',
          href: '/admin/analytics/skillsminds',
          primaryLabel: 'Views',
          primaryValue: sections.skillsminds.totals.views,
          secondaryLabel: 'Posts',
          secondaryValue: sections.skillsminds.totals.posts,
        },
        {
          title: 'no Face Thinker',
          href: '/admin/analytics/nofacethinker',
          primaryLabel: 'Views',
          primaryValue: sections.nofacethinker.totals.views,
          secondaryLabel: 'Posts',
          secondaryValue: sections.nofacethinker.totals.posts,
        },
        {
          title: 'Games',
          href: '/admin/analytics/games',
          primaryLabel: 'Views',
          primaryValue: sections.games.totals.views,
          secondaryLabel: 'Pages',
          secondaryValue: sections.games.items.length,
        },
        {
          title: 'Apps',
          href: '/admin/analytics/apps',
          primaryLabel: 'Downloads',
          primaryValue: sections.apps.totals.downloads,
          secondaryLabel: 'Views',
          secondaryValue: sections.apps.totals.views,
        },
        {
          title: 'Courses',
          href: '/admin/analytics/courses',
          primaryLabel: 'Views',
          primaryValue: sections.courses.totals.views,
          secondaryLabel: 'Pages',
          secondaryValue: sections.courses.items.length,
        },
      ],
    };
  }

  private getAppDetailPage(app: { name: string; shortDescription: string; description: string; slug: string; version: string; releaseNotes: string; downloadUrl: string; updatedAt: string }): PageModel {
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
    } as PageModel;
  }

  private readDownloadCounts(): Record<string, number> {
    const countsFile = join(process.cwd(), 'data', 'download-counts.json');
    try {
      const parsed = JSON.parse(readFileSync(countsFile, 'utf-8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, Number(value) || 0]),
      );
    } catch {
      return {};
    }
  }

  private withSharedModel(page: PageModel, req?: Request) {
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
    const sub = (name: string) => isLocalIp
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

  private toMainSite(req: Request, res: Response, path: string) {
    const host = req.hostname?.toLowerCase().split(':')[0] || '';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.justaidyn.local');
    const base = isLocal ? 'http://localhost:3000' : 'https://justaidyn.com';
    return res.redirect(302, `${base}${path}`);
  }

  private renderStaticHtmlFile(req: Request, res: Response, filePath: string) {
    try {
      const html = readFileSync(filePath, 'utf-8');
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

      return res.render(
        'pages/static-wrapper',
        this.withSharedModel(this.siteService.getStaticPageModel(title, content), req),
      );
    } catch {
      return res.sendFile(filePath);
    }
  }

  private renderAdminSection(req: Request, res: Response, section: 'Posts' | 'Apps' | 'Games' | 'Courses') {
    if (!this.tryRequireSuperadmin(req, res)) {
      return;
    }

    return res.render('pages/host-router', this.withSharedModel(this.siteService.getAdminSectionPage(section), req));
  }

  private tryRequireSuperadmin(req: Request, res: Response): boolean {
    try {
      this.authService.getSuperadminUser(req);
      return true;
    } catch {
      res.redirect('/admin/login');
      return false;
    }
  }



  private parseDesktopRedirectUri(value: string): URL | null {
    try {
      const url = new URL(value);
      const port = Number(url.port);
      const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
      const isValidPort = Number.isInteger(port) && port >= 1 && port <= 65535;

      if (url.protocol !== 'http:' || !isLoopback || !isValidPort || url.pathname !== '/oauth2callback') {
        return null;
      }

      return url;
    } catch {
      return null;
    }
  }

  private getQueryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' ? value[0] : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  private getHeaderValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private safeLocalReturnPath(value: unknown): string {
    if (typeof value !== 'string') return '';
    if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
    try {
      const parsed = new URL(value, 'https://justaidyn.com');
      if (parsed.origin !== 'https://justaidyn.com') return '';
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '';
    }
  }
}
