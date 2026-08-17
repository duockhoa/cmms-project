import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from './common/logger/custom.logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });
  const configService = app.get(ConfigService);

  // Enable CORS based on environment configuration
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(','),
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

  // API versioning - all routes prefixed with /api/v1
  app.setGlobalPrefix('api/v1');

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
