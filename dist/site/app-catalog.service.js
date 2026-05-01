"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppCatalogService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let AppCatalogService = class AppCatalogService {
    constructor() {
        this.installerExtensions = new Set(['.msi', '.exe', '.zip', '.dmg', '.pkg']);
    }
    get catalogPath() {
        return (0, path_1.join)(process.cwd(), 'data', 'apps-catalog.json');
    }
    get desktopVersionPath() {
        return (0, path_1.join)(process.cwd(), 'desktop-version.json');
    }
    list() {
        return this.readCatalog().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }
    listPublished() {
        return this.list().filter((app) => app.published);
    }
    get(slug) {
        const app = this.readCatalog().find((item) => item.slug === slug);
        if (!app)
            throw new common_1.NotFoundException('App not found.');
        return app;
    }
    getPublished(slug) {
        const app = this.get(slug);
        if (!app.published)
            throw new common_1.NotFoundException('App not found.');
        return app;
    }
    save(input) {
        const slug = this.normalizeSlug(input.slug || input.name);
        const version = input.version.trim();
        if (!slug)
            throw new common_1.BadRequestException('slug is required.');
        if (!input.name.trim())
            throw new common_1.BadRequestException('name is required.');
        if (!/^\d+\.\d+\.\d+$/.test(version))
            throw new common_1.BadRequestException('version must be in format X.Y.Z.');
        const catalog = this.readCatalog();
        const existing = catalog.find((item) => item.slug === slug);
        const app = {
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
    attachInstaller(slug, file) {
        if (!file?.path)
            throw new common_1.BadRequestException('Installer file is required.');
        const app = this.get(slug);
        const extension = (0, path_1.extname)(file.originalname).toLowerCase();
        if (!this.installerExtensions.has(extension)) {
            (0, fs_1.rmSync)(file.path, { force: true });
            throw new common_1.BadRequestException('Installer must be .msi, .exe, .zip, .dmg, or .pkg.');
        }
        const appDir = (0, path_1.join)(process.cwd(), 'downloads', 'apps', app.slug);
        (0, fs_1.mkdirSync)(appDir, { recursive: true });
        for (const entry of (0, fs_1.readdirSync)(appDir, { withFileTypes: true })) {
            if (!entry.isFile())
                continue;
            if (this.installerExtensions.has((0, path_1.extname)(entry.name).toLowerCase())) {
                (0, fs_1.rmSync)((0, path_1.join)(appDir, entry.name), { force: true });
            }
        }
        const safeName = this.safeInstallerName(app.name, app.version, extension);
        const target = (0, path_1.join)(appDir, safeName);
        (0, fs_1.renameSync)(file.path, target);
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
    getDownloadUrl(slug) {
        const app = this.getPublished(slug);
        if (!app.downloadUrl)
            throw new common_1.NotFoundException('Installer is not uploaded.');
        return app.downloadUrl;
    }
    readCatalog() {
        if (!(0, fs_1.existsSync)(this.catalogPath)) {
            const seeded = this.seedCatalog();
            this.writeCatalog(seeded);
            return seeded;
        }
        try {
            const parsed = JSON.parse((0, fs_1.readFileSync)(this.catalogPath, 'utf-8'));
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            throw new common_1.BadRequestException('apps-catalog.json is malformed.');
        }
    }
    writeCatalog(items) {
        (0, fs_1.mkdirSync)((0, path_1.join)(process.cwd(), 'data'), { recursive: true });
        (0, fs_1.writeFileSync)(this.catalogPath, JSON.stringify(items, null, 2), 'utf-8');
    }
    seedCatalog() {
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
                fileName: (0, path_1.basename)(decodeURIComponent(downloadUrl)),
                fileSize: 0,
                required: true,
                published: true,
                updatedAt: new Date().toISOString(),
            }];
    }
    readDesktopVersion() {
        if (!(0, fs_1.existsSync)(this.desktopVersionPath))
            return {};
        try {
            return JSON.parse((0, fs_1.readFileSync)(this.desktopVersionPath, 'utf-8'));
        }
        catch {
            return {};
        }
    }
    syncDesktopVersion(app) {
        if (app.slug !== 'justaidyn-screencam' || !app.downloadUrl)
            return;
        const data = {
            version: app.version,
            minVersion: app.version,
            downloadUrl: app.downloadUrl.startsWith('http') ? app.downloadUrl : `https://justaidyn.com${app.downloadUrl}`,
            releaseNotes: app.releaseNotes,
            required: true,
            updatedAt: app.updatedAt,
        };
        (0, fs_1.writeFileSync)(this.desktopVersionPath, JSON.stringify(data, null, 2), 'utf-8');
    }
    normalizeSlug(value) {
        return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    }
    safeInstallerName(name, version, extension) {
        const base = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim() || 'app';
        return `${base} ${version}${extension}`;
    }
};
exports.AppCatalogService = AppCatalogService;
exports.AppCatalogService = AppCatalogService = __decorate([
    (0, common_1.Injectable)()
], AppCatalogService);
