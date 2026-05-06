"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordPageView(req, input, userId) {
        const section = this.cleanSection(input.section);
        const entitySlug = this.cleanSlug(input.entitySlug);
        const entityTitle = this.cleanText(input.entityTitle, 160);
        if (!section || !entitySlug || !entityTitle)
            return;
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
    async recordDownload(req, appSlug, userId) {
        const cleanAppSlug = this.cleanSlug(appSlug);
        if (!cleanAppSlug)
            throw new common_1.BadRequestException('appSlug is required.');
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
    async startPostView(req, input, userId) {
        const postId = this.cleanId(input.postId);
        const visitorId = this.cleanVisitorId(input.visitorId);
        if (!postId || !visitorId) {
            throw new common_1.BadRequestException('postId and visitorId are required.');
        }
        const post = await this.prisma.post.findFirst({ where: { id: postId, published: true }, select: { id: true } });
        if (!post)
            throw new common_1.NotFoundException('Post not found.');
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
    async heartbeatPostView(input) {
        const viewId = this.cleanId(input.viewId);
        if (!viewId)
            throw new common_1.BadRequestException('viewId is required.');
        const durationSeconds = this.cleanDuration(input.durationSeconds);
        await this.prisma.postView.updateMany({
            where: { id: viewId },
            data: { durationSeconds, lastSeenAt: new Date() },
        });
        return { ok: true };
    }
    async getDashboard() {
        const [views, totalViews, durationAggregate, uniqueVisitorRows, uniqueUserRows, downloadEvents, totalDownloads, uniqueDownloadIpRows, pageViews,] = await Promise.all([
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
        const postMap = new Map();
        const dailyMap = new Map();
        views.forEach((view) => {
            const key = view.postId;
            const platform = view.post.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker';
            const current = postMap.get(key) ?? {
                platform,
                title: view.post.title,
                url: `/${platform}/post/${view.post.slug}`,
                views: 0,
                uniqueVisitors: new Set(),
                durationSeconds: 0,
                lastSeenAt: view.lastSeenAt,
            };
            current.views += 1;
            current.uniqueVisitors.add(view.visitorId);
            current.durationSeconds += view.durationSeconds;
            if (view.lastSeenAt > current.lastSeenAt)
                current.lastSeenAt = view.lastSeenAt;
            postMap.set(key, current);
            const date = view.startedAt.toISOString().slice(0, 10);
            const daily = dailyMap.get(date) ?? { date, views: 0, uniqueVisitors: new Set(), durationSeconds: 0 };
            daily.views += 1;
            daily.uniqueVisitors.add(view.visitorId);
            daily.durationSeconds += view.durationSeconds;
            dailyMap.set(date, daily);
        });
        const downloadAppMap = new Map();
        downloadEvents.forEach((event) => {
            const current = downloadAppMap.get(event.appSlug) ?? {
                appSlug: event.appSlug,
                downloads: 0,
                uniqueIps: new Set(),
                lastDownloadedAt: event.createdAt,
            };
            current.downloads += 1;
            current.uniqueIps.add(event.ipAddress);
            if (event.createdAt > current.lastDownloadedAt)
                current.lastDownloadedAt = event.createdAt;
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
    buildPageSections(pageViews) {
        const sections = {
            apps: this.emptyPageSection('Apps'),
            games: this.emptyPageSection('Games'),
            courses: this.emptyPageSection('Courses'),
        };
        pageViews.forEach((view) => {
            const section = view.section;
            if (!sections[section])
                return;
            const key = view.entitySlug;
            const current = sections[section].map.get(key) ?? {
                slug: key,
                title: view.entityTitle,
                url: this.pageEntityUrl(view.section, key, view.path),
                views: 0,
                uniqueVisitors: new Set(),
                lastSeenAt: view.createdAt,
            };
            current.views += 1;
            if (view.ipHash)
                current.uniqueVisitors.add(view.ipHash);
            if (view.createdAt > current.lastSeenAt)
                current.lastSeenAt = view.createdAt;
            sections[section].map.set(key, current);
        });
        return {
            apps: this.finalizePageSection(sections.apps),
            games: this.finalizePageSection(sections.games),
            courses: this.finalizePageSection(sections.courses),
        };
    }
    emptyPageSection(title) {
        return {
            title,
            map: new Map(),
        };
    }
    finalizePageSection(section) {
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
    buildPostTotals(posts) {
        return {
            views: posts.reduce((sum, post) => sum + post.views, 0),
            uniqueVisitors: posts.reduce((sum, post) => sum + post.uniqueVisitors, 0),
            posts: posts.length,
        };
    }
    pageEntityUrl(section, slug, path) {
        if (section === 'apps')
            return slug === 'apps-hub' ? '/apps' : `/apps/${slug}`;
        if (section === 'courses')
            return slug.endsWith('.html') ? `/courses/${slug}` : path;
        if (section === 'games')
            return slug === 'games-hub' ? '/games' : `/games/${slug}`;
        return path;
    }
    cleanSlug(value) {
        return typeof value === 'string' && /^[a-z0-9-.]{1,100}$/.test(value) ? value : '';
    }
    cleanSection(value) {
        return value === 'apps' || value === 'games' || value === 'courses' ? value : '';
    }
    cleanText(value, maxLength) {
        return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : '';
    }
    cleanId(value) {
        return typeof value === 'string' && /^[a-z0-9_-]{8,80}$/i.test(value) ? value : '';
    }
    cleanVisitorId(value) {
        return typeof value === 'string' && /^[a-z0-9_-]{12,80}$/i.test(value) ? value : '';
    }
    cleanPath(value) {
        const path = typeof value === 'string' ? value.trim() : '';
        return path.startsWith('/') && !path.startsWith('//') ? path.slice(0, 300) : '/';
    }
    cleanOptional(value, maxLength) {
        const text = Array.isArray(value) ? value[0] : value;
        return typeof text === 'string' && text.trim() ? text.trim().slice(0, maxLength) : null;
    }
    cleanDuration(value) {
        const duration = Number(value);
        if (!Number.isFinite(duration) || duration < 0)
            return 0;
        return Math.min(Math.round(duration), 8 * 60 * 60);
    }
    hashIp(req) {
        const ip = this.getClientIp(req);
        const salt = process.env.ANALYTICS_HASH_SALT || process.env.SESSION_SECRET || 'justaidyn-analytics';
        return (0, crypto_1.createHash)('sha256').update(`${salt}:${ip}`).digest('hex');
    }
    getClientIp(req) {
        const cfIp = this.cleanOptional(req.headers['cf-connecting-ip'], 200);
        const realIp = this.cleanOptional(req.headers['x-real-ip'], 200);
        const forwarded = this.cleanOptional(req.headers['x-forwarded-for'], 200);
        return (cfIp || realIp || forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress || '').slice(0, 80);
    }
    formatDuration(seconds) {
        const safeSeconds = Math.max(0, Math.round(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const restSeconds = safeSeconds % 60;
        if (minutes < 60)
            return `${minutes}m ${restSeconds}s`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
