import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthMiddleware } from './auth.middleware';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';
import { PostService } from './post.service';
import { AnalyticsService } from './analytics.service';
import { AppCatalogService } from './app-catalog.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SiteController],
  providers: [SiteService, AuthService, PostService, AnalyticsService, AppCatalogService, PrismaService],
})
export class SiteModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
