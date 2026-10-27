import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from './common/logger/custom.logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import { SanitizeResponseInterceptor } from './common/interceptors/sanitize-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  const configService = app.get(ConfigService);

  // Enable HTTP response compression (Gzip/Deflate) to minimize payload transfer size
  app.use(compression());

  // Allow requests from every origin. Using `true` reflects the requesting
  // origin, which remains compatible with credentialed browser requests.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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

  // Swagger Configuration (FastAPI Style)
  const config = new DocumentBuilder()
    .setTitle('API Docs')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Docs',
  });

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS Backend server listening on http://localhost:${port}`);
  console.log(`📄 Swagger docs available at http://localhost:${port}/docs`);
}
bootstrap();
