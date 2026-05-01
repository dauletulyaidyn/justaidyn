import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import express, { NextFunction, Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { join } from 'path';
const hbs = require('hbs');
import { AppModule } from './app.module';

function parseCookie(header: string | undefined, name: string): string | undefined {
  const cookies = header ?? '';
  const match = cookies.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function sameToken(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const viewsPath = join(process.cwd(), 'src', 'views');

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');
  hbs.registerPartials(join(viewsPath, 'partials'));
  hbs.registerHelper('eq', (left: unknown, right: unknown) => left === right);
  hbs.registerHelper('or', (...args: unknown[]) => args.slice(0, -1).some(Boolean));
  hbs.registerHelper('formatDate', (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://cdn.paddle.com")');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "img-src 'self' data: https:",
        "font-src 'self' https://fonts.gstatic.com data:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.paddle.com",
        "script-src 'self' 'unsafe-inline' https://cdn.paddle.com https://*.paddle.com https://www.googletagmanager.com",
        "connect-src 'self' https://api.paddle.com https://sandbox-api.paddle.com https://checkout-service.paddle.com https://*.paddle.com https://www.google-analytics.com",
        "frame-src 'self' https://checkout.paddle.com https://*.paddle.com",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join('; '),
    );
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const csrfCookieName = 'ja_csrf';
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    const csrfExemptPaths = new Set([
      '/api/paddle/webhook',
      '/api/desktop/token',
      '/api/analytics/post-view/start',
      '/api/analytics/post-view/heartbeat',
    ]);
    let csrfToken = parseCookie(req.headers.cookie, csrfCookieName);
    if (!csrfToken) {
      csrfToken = createCsrfToken();
      res.cookie(csrfCookieName, csrfToken, {
        httpOnly: false,
        sameSite: 'lax',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }
    res.locals.csrfToken = csrfToken;

    if (!unsafeMethod || csrfExemptPaths.has(req.path)) {
      return next();
    }

    const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
    const bodyToken = typeof req.body?._csrf === 'string' ? req.body._csrf : '';
    const queryToken = typeof req.query?._csrf === 'string' ? req.query._csrf : '';
    const submittedToken = headerToken || bodyToken || queryToken;
    if (!submittedToken || !sameToken(csrfToken, submittedToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token.' });
    }
    next();
  });

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
