"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const site_module_1 = require("./site/site.module");
const rootPath = process.cwd();
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({ rootPath: (0, path_1.join)(rootPath, 'public'), serveRoot: '/static' }, { rootPath: (0, path_1.join)(rootPath, 'css'), serveRoot: '/css' }, { rootPath: (0, path_1.join)(rootPath, 'js'), serveRoot: '/js' }, { rootPath: (0, path_1.join)(rootPath, 'images'), serveRoot: '/images' }, { rootPath: (0, path_1.join)(rootPath, 'fonts'), serveRoot: '/fonts' }, { rootPath: (0, path_1.join)(rootPath, 'downloads'), serveRoot: '/downloads' }, { rootPath: (0, path_1.join)(rootPath, 'data'), serveRoot: '/data' }, { rootPath: (0, path_1.join)(rootPath, 'articles'), serveRoot: '/articles' }),
            site_module_1.SiteModule,
        ],
    })
], AppModule);
