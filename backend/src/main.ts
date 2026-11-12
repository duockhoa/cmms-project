import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from './common/logger/custom.logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { json, urlencoded } from 'express';
import { SanitizeResponseInterceptor } from './common/interceptors/sanitize-response.interceptor';
import { browserOrigin, allowedBrowserOrigins } from './common/auth/browser-origin';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  const configService = app.get(ConfigService);
  const trustedProxy = configService.get<string>('TRUST_PROXY');
  if (trustedProxy) app.getHttpAdapter().getInstance().set('trust proxy', trustedProxy.split(',').map(value => value.trim()));

  // Enable HTTP response compression (Gzip/Deflate) to minimize payload transfer size
  app.use(compression());
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  app.enableCors({
    origin: browserOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  // CORS controls response visibility; also reject browser writes from other origins.
  app.use((req: any, res: any, next: any) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !allowedBrowserOrigins().has(req.headers.origin)) {
      return res.status(403).json({ message: 'Browser origin is not allowed.' });
    }
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global data sanitization interceptor to prevent internal/sensitive field leakage
  app.useGlobalInterceptors(new SanitizeResponseInterceptor());

  // API versioning - all routes prefixed with /api/v1, except OAuth auto-discovery
  app.setGlobalPrefix('api/v1', {
    exclude: [
      '/.well-known/oauth-authorization-server',
      '/.well-known/openid-configuration',
      '/.well-known/oauth-protected-resource',
    ],
  });

  // Swagger Configuration (Public API Docs - no login required)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('DK Pharma CMMS - API Documentation')
    .setDescription('Tài liệu API hệ thống Quản lý Thiết bị & Bảo trì (CMMS)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DK Pharma CMMS - API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  };
  // Mount under /api/v1/docs so production Nginx /api/ proxy serves it directly without login
  SwaggerModule.setup('docs', app, document, {
    ...swaggerOptions,
    useGlobalPrefix: true,
  });
  // Keep /docs for local development convenience
  SwaggerModule.setup('docs', app, document, swaggerOptions);

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS Backend server listening on http://localhost:${port}`);
  console.log(`📄 Swagger docs available at http://localhost:${port}/api/v1/docs (and /docs)`);
}
bootstrap();
