import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Render, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AuthService } from './auth.service';
import { PageModel, SiteService } from './site.service';
import { PostService } from './post.service';

@Controller()
export class SiteController {
  constructor(
    private readonly siteService: SiteService,
    private readonly authService: AuthService,
    private readonly postService: PostService,
  ) {}

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
    return this.renderAdminSection(req, res, 'Apps');
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
      throw new NotFoundException();
    }

    return res.redirect('/login');
  }

  @Get('/login/google')
  async loginGoogle(@Req() req: Request, @Res() res: Response) {
    const site = this.siteService.resolveHost(req.hostname);
    if (site !== 'main') {
      throw new NotFoundException();
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
    const returnUrl = typeof req.query.return === 'string' ? req.query.return : '';
    if (returnUrl && returnUrl.startsWith('/')) {
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
      throw new NotFoundException();
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
      throw new NotFoundException();
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
      throw new NotFoundException();
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
    const safeReturn = typeof returnUrl === 'string' && returnUrl.startsWith('/') ? returnUrl : '/profile';
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

  @Get('/api/me')
  async desktopMe(@Req() req: Request) {
    const user = await this.authService.verifyBearerToken(req);
    if (!user) throw new UnauthorizedException('Invalid or expired token.');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture,
      role: user.role,
      thinkerSubscriptionStatus: user.thinkerSubscriptionStatus ?? null,
      paddleSubscriptionStatus: user.paddleSubscriptionStatus ?? null,
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

  @Get('/courses')
  coursesProject(@Req() req: Request, @Res() res: Response) {
    return res.redirect('/courses/ai-agents-course.html');
  }

  @Get('/apps')
  appsProject(@Req() req: Request, @Res() res: Response) {
    return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'apps', 'index.html'));
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
  appDetailPath(@Req() req: Request, @Res() res: Response) {
    return this.renderStaticHtmlFile(req, res, join(process.cwd(), 'apps', 'justaidyn-screencam', 'index.html'));
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

  @Get('/api/me')
  apiMe(@Req() req: Request) {
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

  @Post('/api/paddle/webhook')
  paddleWebhook(@Body() body: Record<string, unknown>, @Res() res: Response) {
    try {
      this.authService.handlePaddleWebhook(body);
    } catch {
      // never reject — Paddle retries on non-2xx
    }
    return res.status(200).json({ received: true });
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

    // Course HTML files are served via the root coursePageMap (/:file handler)
    if (section === 'courses' && /\.html$/i.test(file)) {
      return res.redirect(301, `/${file}`);
    }

    const found = join(root, sectionMap[section], file);
    if (!existsSync(found)) {
      throw new NotFoundException();
    }

    if (/\.html$/i.test(file)) {
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
      return this.renderStaticHtmlFile(req, res, found);
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
  trackDownload(@Param('app') app: string, @Res() res: Response) {
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
      currentUser: req ? this.authService.getCurrentUser(req) : null,
      projectLinks: this.siteService.getProjects(),
      mainSiteUrl,
      projectsUrl: `${mainSiteUrl}/projects`,
      articlesUrl: `${mainSiteUrl}/articles/`,
      downloadsUrl: `${mainSiteUrl}/downloads/`,
    };
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
}
