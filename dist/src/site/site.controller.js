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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteController = void 0;
const common_1 = require("@nestjs/common");
const site_service_1 = require("./site.service");
let SiteController = class SiteController {
    constructor(siteService) {
        this.siteService = siteService;
    }
    root(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site === 'main') {
            return this.withSharedModel(this.siteService.getHomePage(), req);
        }
        if (site === 'apps') {
            return this.withSharedModel(this.siteService.getAppsPage(), req);
        }
        return this.withSharedModel(this.siteService.getComingSoonPage(site), req);
    }
    projects(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'main') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getProjectsPage(), req);
    }
    appDetail(req) {
        const site = this.siteService.resolveHost(req.hostname);
        if (site !== 'apps') {
            throw new common_1.NotFoundException();
        }
        return this.withSharedModel(this.siteService.getScreenCamPage(), req);
    }
    withSharedModel(page, req) {
        const host = req?.hostname?.toLowerCase().split(':')[0];
        const mainSiteUrl = host === 'localhost' || host === '127.0.0.1' ? 'http://localhost:3000' : 'https://justaidyn.com';
        return {
            ...page,
            year: new Date().getFullYear(),
            projectLinks: this.siteService.getProjects(),
            mainSiteUrl,
            projectsUrl: `${mainSiteUrl}/projects`,
            articlesUrl: `${mainSiteUrl}/articles/`,
            downloadsUrl: `${mainSiteUrl}/downloads/`,
        };
    }
};
exports.SiteController = SiteController;
__decorate([
    (0, common_1.Get)('/'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "root", null);
__decorate([
    (0, common_1.Get)('/projects'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "projects", null);
__decorate([
    (0, common_1.Get)('/justaidyn-screencam'),
    (0, common_1.Render)('pages/host-router'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SiteController.prototype, "appDetail", null);
exports.SiteController = SiteController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [site_service_1.SiteService])
], SiteController);
