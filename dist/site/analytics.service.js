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
        const [views, totalViews, durationAggregate, uniqueVisitorRows, uniqueUserRows] = await Promise.all([
            this.prisma.postView.findMany({
                orderBy: { startedAt: 'desc' },
                take: 10000,
                include: { post: { select: { id: true, title: true, slug: true, platform: true } }, user: { select: { email: true } } },
            }),
            this.prisma.postView.count(),
            this.prisma.postView.aggregate({ _sum: { durationSeconds: true } }),
            this.prisma.postView.findMany({ distinct: ['visitorId'], select: { visitorId: true } }),
            this.prisma.postView.findMany({ where: { userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
        ]);
        const totalDurationSeconds = durationAggregate._sum.durationSeconds ?? 0;
        const postMap = new Map();
        const dailyMap = new Map();
        views.forEach((view) => {
            const key = view.postId;
            const platform = view.post.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker';
            const current = postMap.get(key) ?? {
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
        };
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
        const forwarded = this.cleanOptional(req.headers['x-forwarded-for'], 200);
        const ip = forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const salt = process.env.ANALYTICS_HASH_SALT || process.env.SESSION_SECRET || 'justaidyn-analytics';
        return (0, crypto_1.createHash)('sha256').update(`${salt}:${ip}`).digest('hex');
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
