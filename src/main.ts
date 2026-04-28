import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';
const hbs = require('hbs');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const viewsPath = join(process.cwd(), 'src', 'views');

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');
  hbs.registerPartials(join(viewsPath, 'partials'));
  hbs.registerHelper('eq', (left: unknown, right: unknown) => left === right);
  hbs.registerHelper('or', (...args: unknown[]) => args.slice(0, -1).some(Boolean));

  const root = process.cwd();
  app.use('/css', express.static(join(root, 'css')));
  app.use('/js', express.static(join(root, 'js')));
  app.use('/images', express.static(join(root, 'images')));
  app.use('/fonts', express.static(join(root, 'fonts')));
  app.use('/downloads', express.static(join(root, 'downloads')));
  app.use('/data', express.static(join(root, 'data')));
  app.use('/articles', express.static(join(root, 'articles')));
  app.use('/static', express.static(join(root, 'public')));
  app.use('/public', express.static(join(root, 'public')));

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
