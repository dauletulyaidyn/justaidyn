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

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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
    ]);

    const totalDurationSeconds = durationAggregate._sum.durationSeconds ?? 0;
    const postMap = new Map<string, {
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

    return {
      totals: {
        views: totalViews,
        uniqueVisitors: uniqueVisitorRows.length,
        uniqueUsers: uniqueUserRows.length,
        totalDuration: this.formatDuration(totalDurationSeconds),
        averageDuration: this.formatDuration(totalViews ? Math.round(totalDurationSeconds / totalViews) : 0),
      },
      posts: Array.from(postMap.values())
        .map((post) => ({
          title: post.title,
          url: post.url,
          views: post.views,
          uniqueVisitors: post.uniqueVisitors.size,
          totalDuration: this.formatDuration(post.durationSeconds),
          averageDuration: this.formatDuration(post.views ? Math.round(post.durationSeconds / post.views) : 0),
          lastSeenAt: post.lastSeenAt.toISOString(),
        }))
        .sort((left, right) => right.views - left.views),
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

  private cleanSlug(value: unknown): string {
    return typeof value === 'string' && /^[a-z0-9-]{1,80}$/.test(value) ? value : '';
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
