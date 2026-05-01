import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';

export interface AppCatalogItem {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  version: string;
  minVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  required: boolean;
  published: boolean;
  updatedAt: string;
}

interface SaveAppInput {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  version: string;
  releaseNotes: string;
  published: boolean;
}

@Injectable()
export class AppCatalogService {
  private readonly installerExtensions = new Set(['.msi', '.exe', '.zip', '.dmg', '.pkg']);

  private get catalogPath() {
    return join(process.cwd(), 'data', 'apps-catalog.json');
  }

  private get desktopVersionPath() {
    return join(process.cwd(), 'desktop-version.json');
  }

  list(): AppCatalogItem[] {
    return this.readCatalog().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listPublished(): AppCatalogItem[] {
    return this.list().filter((app) => app.published);
  }

  get(slug: string): AppCatalogItem {
    const app = this.readCatalog().find((item) => item.slug === slug);
    if (!app) throw new NotFoundException('App not found.');
    return app;
  }

  getPublished(slug: string): AppCatalogItem {
    const app = this.get(slug);
    if (!app.published) throw new NotFoundException('App not found.');
    return app;
  }

  save(input: SaveAppInput): AppCatalogItem {
    const slug = this.normalizeSlug(input.slug || input.name);
    const version = input.version.trim();
    if (!slug) throw new BadRequestException('slug is required.');
    if (!input.name.trim()) throw new BadRequestException('name is required.');
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new BadRequestException('version must be in format X.Y.Z.');

    const catalog = this.readCatalog();
    const existing = catalog.find((item) => item.slug === slug);
    const app: AppCatalogItem = {
      slug,
      name: input.name.trim(),
      shortDescription: input.shortDescription.trim(),
      description: input.description.trim(),
      version,
      minVersion: version,
      releaseNotes: input.releaseNotes.trim(),
      downloadUrl: existing?.downloadUrl ?? '',
      fileName: existing?.fileName ?? '',
      fileSize: existing?.fileSize ?? 0,
      required: true,
      published: input.published,
      updatedAt: new Date().toISOString(),
    };

    const next = existing ? catalog.map((item) => item.slug === slug ? app : item) : [...catalog, app];
    this.writeCatalog(next);
    this.syncDesktopVersion(app);
    return app;
  }

  attachInstaller(slug: string, file: { originalname: string; path: string; size: number }): AppCatalogItem {
    if (!file?.path) throw new BadRequestException('Installer file is required.');
    const app = this.get(slug);
    const extension = extname(file.originalname).toLowerCase();
    if (!this.installerExtensions.has(extension)) {
      rmSync(file.path, { force: true });
      throw new BadRequestException('Installer must be .msi, .exe, .zip, .dmg, or .pkg.');
    }

    const appDir = join(process.cwd(), 'downloads', 'apps', app.slug);
    mkdirSync(appDir, { recursive: true });
    for (const entry of readdirSync(appDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (this.installerExtensions.has(extname(entry.name).toLowerCase())) {
        rmSync(join(appDir, entry.name), { force: true });
      }
    }

    const safeName = this.safeInstallerName(app.name, app.version, extension);
    const target = join(appDir, safeName);
    renameSync(file.path, target);

    const downloadUrl = `/downloads/apps/${encodeURIComponent(app.slug)}/${encodeURIComponent(safeName)}`;
    const updated = {
      ...app,
      fileName: safeName,
      fileSize: file.size,
      downloadUrl,
      minVersion: app.version,
      required: true,
      updatedAt: new Date().toISOString(),
    };
    this.writeCatalog(this.readCatalog().map((item) => item.slug === app.slug ? updated : item));
    this.syncDesktopVersion(updated);
    return updated;
  }

  getDownloadUrl(slug: string): string {
    const app = this.getPublished(slug);
    if (!app.downloadUrl) throw new NotFoundException('Installer is not uploaded.');
    return app.downloadUrl;
  }

  private readCatalog(): AppCatalogItem[] {
    if (!existsSync(this.catalogPath)) {
      const seeded = this.seedCatalog();
      this.writeCatalog(seeded);
      return seeded;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.catalogPath, 'utf-8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new BadRequestException('apps-catalog.json is malformed.');
    }
  }

  private writeCatalog(items: AppCatalogItem[]) {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(this.catalogPath, JSON.stringify(items, null, 2), 'utf-8');
  }

  private seedCatalog(): AppCatalogItem[] {
    const versionData = this.readDesktopVersion();
    const version = typeof versionData.version === 'string' && versionData.version ? versionData.version : '1.1.4';
    const downloadUrl = typeof versionData.downloadUrl === 'string' ? versionData.downloadUrl : '/downloads/apps/justaidyn-screencam/JustAidyn%20ScreenCam%201.1.4.msi';
    return [{
      slug: 'justaidyn-screencam',
      name: 'JustAidyn ScreenCam',
      shortDescription: 'Screen recording app for JustAidyn users.',
      description: 'Capture workflows, record screen sessions, and receive automatic updates from JustAidyn.',
      version,
      minVersion: version,
      releaseNotes: typeof versionData.releaseNotes === 'string' ? versionData.releaseNotes : '',
      downloadUrl,
      fileName: basename(decodeURIComponent(downloadUrl)),
      fileSize: 0,
      required: true,
      published: true,
      updatedAt: new Date().toISOString(),
    }];
  }

  private readDesktopVersion(): Record<string, unknown> {
    if (!existsSync(this.desktopVersionPath)) return {};
    try {
      return JSON.parse(readFileSync(this.desktopVersionPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private syncDesktopVersion(app: AppCatalogItem) {
    if (app.slug !== 'justaidyn-screencam' || !app.downloadUrl) return;
    const data = {
      version: app.version,
      minVersion: app.version,
      downloadUrl: app.downloadUrl.startsWith('http') ? app.downloadUrl : `https://justaidyn.com${app.downloadUrl}`,
      releaseNotes: app.releaseNotes,
      required: true,
      updatedAt: app.updatedAt,
    };
    writeFileSync(this.desktopVersionPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private normalizeSlug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  }

  private safeInstallerName(name: string, version: string, extension: string): string {
    const base = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim() || 'app';
    return `${base} ${version}${extension}`;
  }
}
