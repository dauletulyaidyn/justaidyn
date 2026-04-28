"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const express_1 = __importDefault(require("express"));
const path_1 = require("path");
const hbs = require('hbs');
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const viewsPath = (0, path_1.join)(process.cwd(), 'src', 'views');
    app.setBaseViewsDir(viewsPath);
    app.setViewEngine('hbs');
    hbs.registerPartials((0, path_1.join)(viewsPath, 'partials'));
    hbs.registerHelper('eq', (left, right) => left === right);
    hbs.registerHelper('or', (...args) => args.slice(0, -1).some(Boolean));
    const root = process.cwd();
    app.use('/css', express_1.default.static((0, path_1.join)(root, 'css')));
    app.use('/js', express_1.default.static((0, path_1.join)(root, 'js')));
    app.use('/images', express_1.default.static((0, path_1.join)(root, 'images')));
    app.use('/fonts', express_1.default.static((0, path_1.join)(root, 'fonts')));
    app.use('/downloads', express_1.default.static((0, path_1.join)(root, 'downloads')));
    app.use('/data', express_1.default.static((0, path_1.join)(root, 'data')));
    app.use('/articles', express_1.default.static((0, path_1.join)(root, 'articles')));
    app.use('/static', express_1.default.static((0, path_1.join)(root, 'public')));
    app.use('/public', express_1.default.static((0, path_1.join)(root, 'public')));
    await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}
bootstrap();
