import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../prisma.service';

export interface StartPostViewInput {
  postId?: string;
  visitorId?: string;
  path?: string;
  referrer?: string;
}

export interface HeartbeatPostViewInput {
  viewId?: string;
  durationSeconds?: number;
}

export interface PageViewInput {
  section: 'apps' | 'games' | 'courses';
  entitySlug: string;
  entityTitle: string;
  path?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPageView(req: Request, input: PageViewInput, userId?: string) {
    const section = this.cleanSection(input.section);
    const entitySlug = this.cleanSlug(input.entitySlug);
    const entityTitle = this.cleanText(input.entityTitle, 160);
    if (!section || !entitySlug || !entityTitle) return;

    await this.prisma.pageView.create({
      data: {
        section,
        entitySlug,
        entityTitle,
        userId: userId || null,
        path: this.cleanPath(input.path || req.originalUrl || req.path),
        referrer: this.cleanOptional(req.headers.referer || req.headers.referrer, 500),
        userAgent: this.cleanOptional(req.headers['user-agent'], 500),
        ipHash: this.hashIp(req),
      },
    });
  }

  async recordDownload(req: Request, appSlug: string, userId?: string) {
    const cleanAppSlug = this.cleanSlug(appSlug);
    if (!cleanAppSlug) throw new BadRequestException('appSlug is required.');

    await this.prisma.downloadEvent.create({
      data: {
        appSlug: cleanAppSlug,
        userId: userId || null,
        ipAddress: this.getClientIp(req),
        referrer: this.cleanOptional(req.headers.referer || req.headers.referrer, 500),
        userAgent: this.cleanOptional(req.headers['user-agent'], 500),
      },
    });
  }

  async startPostView(req: Request, input: StartPostViewInput, userId?: string) {
    const postId = this.cleanId(input.postId);
    const visitorId = this.cleanVisitorId(input.visitorId);
    if (!postId || !visitorId) {
      throw new BadRequestException('postId and visitorId are required.');
    }

    const post = await this.prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found.');

    const view = await this.prisma.postView.create({
      data: {
        postId,
        userId: userId || null,
        visitorId,
        path: this.cleanPath(input.path),
        referrer: this.cleanOptional(input.referrer, 500),
        userAgent: this.cleanOptional(req.headers['user-agent'], 500),
        ipHash: this.hashIp(req),
      },
      select: { id: true, startedAt: true },
    });

    return { viewId: view.id, startedAt: view.startedAt.toISOString() };
  }

  async heartbeatPostView(input: HeartbeatPostViewInput) {
    const viewId = this.cleanId(input.viewId);
    if (!viewId) throw new BadRequestException('viewId is required.');
    const durationSeconds = this.cleanDuration(input.durationSeconds);

    await this.prisma.postView.updateMany({
      where: { id: viewId },
      data: { durationSeconds, lastSeenAt: new Date() },
    });

    return { ok: true };
  }

  async getDashboard() {
    const [
      views,
      totalViews,
      durationAggregate,
      uniqueVisitorRows,
      uniqueUserRows,
      downloadEvents,
      totalDownloads,
      uniqueDownloadIpRows,
      pageViews,
    ] = await Promise.all([
      this.prisma.postView.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10000,
        include: { post: { select: { id: true, title: true, slug: true, platform: true } }, user: { select: { email: true } } },
      }),
      this.prisma.postView.count(),
      this.prisma.postView.aggregate({ _sum: { durationSeconds: true } }),
      this.prisma.postView.findMany({ distinct: ['visitorId'], select: { visitorId: true } }),
      this.prisma.postView.findMany({ where: { userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.downloadEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10000,
        include: { user: { select: { email: true } } },
      }),
      this.prisma.downloadEvent.count(),
      this.prisma.downloadEvent.findMany({ distinct: ['ipAddress'], select: { ipAddress: true } }),
      this.prisma.pageView.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10000,
        include: { user: { select: { email: true } } },
      }),
    ]);

    const totalDurationSeconds = durationAggregate._sum.durationSeconds ?? 0;
    const postMap = new Map<string, {
      platform: 'skillsminds' | 'nofacethinker';
      title: string;
      url: string;
      views: number;
      uniqueVisitors: Set<string>;
      durationSeconds: number;
      lastSeenAt: Date;
    }>();
    const dailyMap = new Map<string, { date: string; views: number; uniqueVisitors: Set<string>; durationSeconds: number }>();

    views.forEach((view) => {
      const key = view.postId;
      const platform = view.post.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker';
      const current = postMap.get(key) ?? {
        platform,
        title: view.post.title,
        url: `/${platform}/post/${view.post.slug}`,
        views: 0,
        uniqueVisitors: new Set<string>(),
        durationSeconds: 0,
        lastSeenAt: view.lastSeenAt,
      };
      current.views += 1;
      current.uniqueVisitors.add(view.visitorId);
      current.durationSeconds += view.durationSeconds;
      if (view.lastSeenAt > current.lastSeenAt) current.lastSeenAt = view.lastSeenAt;
      postMap.set(key, current);

      const date = view.startedAt.toISOString().slice(0, 10);
      const daily = dailyMap.get(date) ?? { date, views: 0, uniqueVisitors: new Set<string>(), durationSeconds: 0 };
      daily.views += 1;
      daily.uniqueVisitors.add(view.visitorId);
      daily.durationSeconds += view.durationSeconds;
      dailyMap.set(date, daily);
    });

    const downloadAppMap = new Map<string, { appSlug: string; downloads: number; uniqueIps: Set<string>; lastDownloadedAt: Date }>();
    downloadEvents.forEach((event) => {
      const current = downloadAppMap.get(event.appSlug) ?? {
        appSlug: event.appSlug,
        downloads: 0,
        uniqueIps: new Set<string>(),
        lastDownloadedAt: event.createdAt,
      };
      current.downloads += 1;
      current.uniqueIps.add(event.ipAddress);
      if (event.createdAt > current.lastDownloadedAt) current.lastDownloadedAt = event.createdAt;
      downloadAppMap.set(event.appSlug, current);
    });

    const pageSections = this.buildPageSections(pageViews);
    const posts = Array.from(postMap.values())
      .map((post) => ({
        platform: post.platform,
        title: post.title,
        url: post.url,
        views: post.views,
        uniqueVisitors: post.uniqueVisitors.size,
        totalDuration: this.formatDuration(post.durationSeconds),
        averageDuration: this.formatDuration(post.views ? Math.round(post.durationSeconds / post.views) : 0),
        lastSeenAt: post.lastSeenAt.toISOString(),
      }))
      .sort((left, right) => right.views - left.views);
    const appPageItems = pageSections.apps.items.filter((item) => item.slug !== 'apps-hub');
    const downloadApps = Array.from(downloadAppMap.values())
      .map((app) => {
        const viewStats = appPageItems.find((item) => item.slug === app.appSlug);
        return {
          appSlug: app.appSlug,
          title: viewStats?.title || app.appSlug,
          url: viewStats?.url || `/apps/${app.appSlug}`,
          views: viewStats?.views || 0,
          uniqueVisitors: viewStats?.uniqueVisitors || 0,
          downloads: app.downloads,
          uniqueIps: app.uniqueIps.size,
          uniqueVisitorKeys: viewStats?.visitorKeys || [],
          lastSeenAt: viewStats?.lastSeenAt || '',
          lastDownloadedAt: app.lastDownloadedAt.toISOString(),
        };
      })
      .sort((left, right) => (right.downloads + right.views) - (left.downloads + left.views));
    appPageItems.forEach((item) => {
      if (!downloadApps.some((app) => app.appSlug === item.slug)) {
        downloadApps.push({
          appSlug: item.slug,
          title: item.title,
          url: item.url,
          views: item.views,
          uniqueVisitors: item.uniqueVisitors,
          downloads: 0,
          uniqueIps: 0,
          uniqueVisitorKeys: item.visitorKeys,
          lastSeenAt: item.lastSeenAt,
          lastDownloadedAt: '',
        });
      }
    });

    return {
      totals: {
        views: totalViews,
        uniqueVisitors: uniqueVisitorRows.length,
        uniqueUsers: uniqueUserRows.length,
        totalDuration: this.formatDuration(totalDurationSeconds),
        averageDuration: this.formatDuration(totalViews ? Math.round(totalDurationSeconds / totalViews) : 0),
      },
      sections: {
        skillsminds: {
          title: 'Skills and Minds Hub',
          totals: this.buildPostTotals(posts.filter((post) => post.platform === 'skillsminds')),
          posts: posts.filter((post) => post.platform === 'skillsminds'),
        },
        nofacethinker: {
          title: 'no Face Thinker',
          totals: this.buildPostTotals(posts.filter((post) => post.platform === 'nofacethinker')),
          posts: posts.filter((post) => post.platform === 'nofacethinker'),
        },
        games: pageSections.games,
        apps: {
          title: 'Apps',
          totals: {
            views: downloadApps.reduce((sum, app) => sum + app.views, 0),
            uniqueVisitors: new Set(downloadApps.flatMap((app) => app.uniqueVisitorKeys)).size,
            downloads: totalDownloads,
            uniqueIps: uniqueDownloadIpRows.length,
          },
          items: downloadApps.map(({ uniqueVisitorKeys: _keys, ...app }) => app),
        },
        courses: pageSections.courses,
      },
      posts,
      daily: Array.from(dailyMap.values())
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-30)
        .map((day) => ({
          date: day.date,
          views: day.views,
          uniqueVisitors: day.uniqueVisitors.size,
          totalDuration: this.formatDuration(day.durationSeconds),
        })),
      recentViews: views.slice(0, 50).map((view) => ({
        title: view.post.title,
        url: `/${view.post.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker'}/post/${view.post.slug}`,
        visitorId: view.visitorId.slice(0, 10),
        userEmail: view.user?.email ?? '',
        duration: this.formatDuration(view.durationSeconds),
        startedAt: view.startedAt.toISOString(),
      })),
      downloads: {
        totals: {
          downloads: totalDownloads,
          uniqueIps: uniqueDownloadIpRows.length,
        },
        apps: Array.from(downloadAppMap.values())
          .map((app) => ({
            appSlug: app.appSlug,
            downloads: app.downloads,
            uniqueIps: app.uniqueIps.size,
            lastDownloadedAt: app.lastDownloadedAt.toISOString(),
          }))
          .sort((left, right) => right.downloads - left.downloads),
        recent: downloadEvents.slice(0, 50).map((event) => ({
          appSlug: event.appSlug,
          ipAddress: event.ipAddress,
          userEmail: event.user?.email ?? '',
          referrer: event.referrer ?? '',
          userAgent: event.userAgent ?? '',
          downloadedAt: event.createdAt.toISOString(),
        })),
      },
    };
  }

  private buildPageSections(pageViews: Array<{
    section: string;
    entitySlug: string;
    entityTitle: string;
    path: string;
    ipHash: string | null;
    createdAt: Date;
  }>) {
    const sections = {
      apps: this.emptyPageSection('Apps'),
      games: this.emptyPageSection('Games'),
      courses: this.emptyPageSection('Courses'),
    };

    pageViews.forEach((view) => {
      const section = view.section as keyof typeof sections;
      if (!sections[section]) return;
      const key = view.entitySlug;
      const current = sections[section].map.get(key) ?? {
        slug: key,
        title: view.entityTitle,
        url: this.pageEntityUrl(view.section, key, view.path),
        views: 0,
        uniqueVisitors: new Set<string>(),
        lastSeenAt: view.createdAt,
      };
      current.views += 1;
      if (view.ipHash) current.uniqueVisitors.add(view.ipHash);
      if (view.createdAt > current.lastSeenAt) current.lastSeenAt = view.createdAt;
      sections[section].map.set(key, current);
    });

    return {
      apps: this.finalizePageSection(sections.apps),
      games: this.finalizePageSection(sections.games),
      courses: this.finalizePageSection(sections.courses),
    };
  }

  private emptyPageSection(title: string) {
    return {
      title,
      map: new Map<string, {
        slug: string;
        title: string;
        url: string;
        views: number;
        uniqueVisitors: Set<string>;
        lastSeenAt: Date;
      }>(),
    };
  }

  private finalizePageSection(section: ReturnType<AnalyticsService['emptyPageSection']>) {
    const items = Array.from(section.map.values())
      .map((item) => ({
        slug: item.slug,
        title: item.title,
        url: item.url,
        views: item.views,
        uniqueVisitors: item.uniqueVisitors.size,
        visitorKeys: Array.from(item.uniqueVisitors),
        lastSeenAt: item.lastSeenAt.toISOString(),
      }))
      .sort((left, right) => right.views - left.views);
    return {
      title: section.title,
      totals: {
        views: items.reduce((sum, item) => sum + item.views, 0),
        uniqueVisitors: new Set(Array.from(section.map.values()).flatMap((item) => Array.from(item.uniqueVisitors))).size,
      },
      items,
    };
  }

  private buildPostTotals(posts: Array<{ views: number; uniqueVisitors: number }>) {
    return {
      views: posts.reduce((sum, post) => sum + post.views, 0),
      uniqueVisitors: posts.reduce((sum, post) => sum + post.uniqueVisitors, 0),
      posts: posts.length,
    };
  }

  private pageEntityUrl(section: string, slug: string, path: string): string {
    if (section === 'apps') return slug === 'apps-hub' ? '/apps' : `/apps/${slug}`;
    if (section === 'courses') return slug.endsWith('.html') ? `/courses/${slug}` : path;
    if (section === 'games') return slug === 'games-hub' ? '/games' : `/games/${slug}`;
    return path;
  }

  private cleanSlug(value: unknown): string {
    return typeof value === 'string' && /^[a-z0-9-.]{1,100}$/.test(value) ? value : '';
  }

  private cleanSection(value: unknown): 'apps' | 'games' | 'courses' | '' {
    return value === 'apps' || value === 'games' || value === 'courses' ? value : '';
  }

  private cleanText(value: unknown, maxLength: number): string {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : '';
  }

  private cleanId(value: unknown): string {
    return typeof value === 'string' && /^[a-z0-9_-]{8,80}$/i.test(value) ? value : '';
  }

  private cleanVisitorId(value: unknown): string {
    return typeof value === 'string' && /^[a-z0-9_-]{12,80}$/i.test(value) ? value : '';
  }

  private cleanPath(value: unknown): string {
    const path = typeof value === 'string' ? value.trim() : '';
    return path.startsWith('/') && !path.startsWith('//') ? path.slice(0, 300) : '/';
  }

  private cleanOptional(value: unknown, maxLength: number): string | null {
    const text = Array.isArray(value) ? value[0] : value;
    return typeof text === 'string' && text.trim() ? text.trim().slice(0, maxLength) : null;
  }

  private cleanDuration(value: unknown): number {
    const duration = Number(value);
    if (!Number.isFinite(duration) || duration < 0) return 0;
    return Math.min(Math.round(duration), 8 * 60 * 60);
  }

  private hashIp(req: Request): string {
    const ip = this.getClientIp(req);
    const salt = process.env.ANALYTICS_HASH_SALT || process.env.SESSION_SECRET || 'justaidyn-analytics';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }

  private getClientIp(req: Request): string {
    const cfIp = this.cleanOptional(req.headers['cf-connecting-ip'], 200);
    const realIp = this.cleanOptional(req.headers['x-real-ip'], 200);
    const forwarded = this.cleanOptional(req.headers['x-forwarded-for'], 200);
    return (cfIp || realIp || forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress || '').slice(0, 80);
  }

  private formatDuration(seconds: number): string {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const restSeconds = safeSeconds % 60;
    if (minutes < 60) return `${minutes}m ${restSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
}
