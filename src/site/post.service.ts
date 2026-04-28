import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface PostDto {
  id: string;
  platform: 'skillsminds' | 'nofacethinker';
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostInput {
  platform: 'skillsminds' | 'nofacethinker';
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  published?: boolean;
}

export type UpdatePostInput = Partial<Omit<CreatePostInput, 'platform'>>;

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  private map(p: any): PostDto {
    return {
      id: p.id,
      platform: p.platform === 'SKILLSMINDS' ? 'skillsminds' : 'nofacethinker',
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage ?? undefined,
      published: p.published,
      publishedAt: p.publishedAt?.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toPrismaEnum(platform: 'skillsminds' | 'nofacethinker'): Platform {
    return platform === 'skillsminds' ? Platform.SKILLSMINDS : Platform.NOFACETHINKER;
  }

  async listPublished(platform: 'skillsminds' | 'nofacethinker'): Promise<PostDto[]> {
    const posts = await this.prisma.post.findMany({
      where: { platform: this.toPrismaEnum(platform), published: true },
      orderBy: { publishedAt: 'desc' },
    });
    return posts.map((p) => this.map(p));
  }

  async listAll(): Promise<PostDto[]> {
    const posts = await this.prisma.post.findMany({ orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }] });
    return posts.map((p) => this.map(p));
  }

  async getBySlug(platform: 'skillsminds' | 'nofacethinker', slug: string): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({ where: { platform_slug: { platform: this.toPrismaEnum(platform), slug } } });
    if (!post || !post.published) throw new NotFoundException('Post not found.');
    return this.map(post);
  }

  async getById(id: string): Promise<PostDto> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found.');
    return this.map(post);
  }

  async create(input: CreatePostInput): Promise<PostDto> {
    const slug = input.slug || this.slugify(input.title);
    const post = await this.prisma.post.create({
      data: {
        platform: this.toPrismaEnum(input.platform),
        title: input.title,
        slug,
        excerpt: input.excerpt ?? '',
        content: input.content ?? '',
        coverImage: input.coverImage || null,
        published: input.published ?? false,
        publishedAt: input.published ? new Date() : null,
      },
    });
    return this.map(post);
  }

  async update(id: string, input: UpdatePostInput): Promise<PostDto> {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found.');
    const wasPublished = existing.published;
    const nowPublished = input.published !== undefined ? input.published : existing.published;
    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...(input.title    !== undefined && { title: input.title }),
        ...(input.slug     !== undefined && { slug: input.slug }),
        ...(input.excerpt  !== undefined && { excerpt: input.excerpt }),
        ...(input.content  !== undefined && { content: input.content }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage || null }),
        ...(input.published !== undefined && { published: input.published }),
        ...(!wasPublished && nowPublished && { publishedAt: new Date() }),
      },
    });
    return this.map(post);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.post.delete({ where: { id } });
  }

  private slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `post-${Date.now()}`;
  }
}
