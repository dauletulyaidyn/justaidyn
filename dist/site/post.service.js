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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const prisma_service_1 = require("../prisma.service");
let PostService = class PostService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    map(p) {
        return {
            id: p.id,
            platform: p.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker',
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt,
            content: this.sanitizePostHtml(p.content),
            coverImage: p.coverImage ?? undefined,
            published: p.published,
            publishedAt: p.publishedAt?.toISOString(),
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        };
    }
    toPrismaEnum(platform) {
        return platform === 'skillsminds' ? client_1.Platform.SKILLSMINDS : client_1.Platform.NOFACETHINKER;
    }
    async listPublished(platform) {
        const posts = await this.prisma.post.findMany({
            where: { platform: this.toPrismaEnum(platform), published: true },
            orderBy: { publishedAt: 'desc' },
        });
        return posts.map((p) => this.map(p));
    }
    async listAll() {
        const posts = await this.prisma.post.findMany({ orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }] });
        return posts.map((p) => this.map(p));
    }
    async getBySlug(platform, slug) {
        const post = await this.prisma.post.findUnique({ where: { platform_slug: { platform: this.toPrismaEnum(platform), slug } } });
        if (!post || !post.published)
            throw new common_1.NotFoundException('Post not found.');
        return this.map(post);
    }
    async getById(id) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post)
            throw new common_1.NotFoundException('Post not found.');
        return this.map(post);
    }
    async create(input) {
        const slug = input.slug || this.slugify(input.title);
        const post = await this.prisma.post.create({
            data: {
                platform: this.toPrismaEnum(input.platform),
                title: input.title,
                slug,
                excerpt: input.excerpt ?? '',
                content: this.sanitizePostHtml(input.content ?? ''),
                coverImage: input.coverImage || null,
                published: input.published ?? false,
                publishedAt: input.published ? new Date() : null,
            },
        });
        return this.map(post);
    }
    async update(id, input) {
        const existing = await this.prisma.post.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Post not found.');
        const wasPublished = existing.published;
        const nowPublished = input.published !== undefined ? input.published : existing.published;
        const post = await this.prisma.post.update({
            where: { id },
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
                ...(input.content !== undefined && { content: this.sanitizePostHtml(input.content) }),
                ...(input.coverImage !== undefined && { coverImage: input.coverImage || null }),
                ...(input.published !== undefined && { published: input.published }),
                ...(!wasPublished && nowPublished && { publishedAt: new Date() }),
            },
        });
        return this.map(post);
    }
    async delete(id) {
        await this.prisma.post.delete({ where: { id } });
    }
    slugify(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `post-${Date.now()}`;
    }
    sanitizePostHtml(html) {
        return (0, sanitize_html_1.default)(html || '', {
            allowedTags: [
                'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
                'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote',
                'pre', 'code', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'hr', 'figure', 'figcaption',
            ],
            allowedAttributes: {
                a: ['href', 'title', 'target', 'rel'],
                img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
                code: ['class'],
                pre: ['class'],
                th: ['colspan', 'rowspan'],
                td: ['colspan', 'rowspan'],
            },
            allowedSchemes: ['http', 'https', 'mailto'],
            allowedSchemesByTag: {
                img: ['http', 'https', 'data'],
            },
            transformTags: {
                a: sanitize_html_1.default.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
            },
            allowedClasses: {
                code: [/^language-[a-z0-9-]+$/],
                pre: [/^language-[a-z0-9-]+$/],
            },
        });
    }
};
exports.PostService = PostService;
exports.PostService = PostService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostService);
