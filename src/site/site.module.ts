import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SiteController } from './site.controller';
import { SiteService } from './site.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SiteController],
  providers: [SiteService, AuthService, PrismaService],
})
export class SiteModule {}
