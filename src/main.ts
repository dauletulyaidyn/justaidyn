import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
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

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
