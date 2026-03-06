import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // All routes live under /api/* so the gateway proxy works without path rewriting.
  // Swagger is excluded — it registers its own raw Express route at /api/docs.
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SpaceSub API')
    .setDescription('Subscription management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SpaceSub API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`  FRONTEND_URL        = ${process.env.FRONTEND_URL ?? '(not set)'}`);
  console.log(`  YANDEX_REDIRECT_URI = ${process.env.YANDEX_REDIRECT_URI ?? '(not set)'}`);
  console.log(`  FLEX_BANK_BASE_URL  = ${process.env.FLEX_BANK_BASE_URL ?? '(not set)'}`);
}
bootstrap();
