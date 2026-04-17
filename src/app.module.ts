import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SiteModule } from './site/site.module';

const rootPath = process.cwd();

@Module({
  imports: [
    ServeStaticModule.forRoot(
      { rootPath: join(rootPath, 'public'), serveRoot: '/static' },
      { rootPath: join(rootPath, 'css'), serveRoot: '/css' },
      { rootPath: join(rootPath, 'js'), serveRoot: '/js' },
      { rootPath: join(rootPath, 'images'), serveRoot: '/images' },
      { rootPath: join(rootPath, 'fonts'), serveRoot: '/fonts' },
      { rootPath: join(rootPath, 'downloads'), serveRoot: '/downloads' },
      { rootPath: join(rootPath, 'data'), serveRoot: '/data' },
      { rootPath: join(rootPath, 'articles'), serveRoot: '/articles' },
    ),
    SiteModule,
  ],
})
export class AppModule {}
