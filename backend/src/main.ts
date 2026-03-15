import dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Force IPv4 for all DNS resolution — Railway containers often fail
// on IPv6 connections to external services (Yandex OAuth, etc.)
dns.setDefaultResultOrder('ipv4first');

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
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = [
        'http://localhost:5174',
        'http://localhost:5173',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      // Allow any *.vercel.app deployment preview
      if (
        allowed.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`SpaceSub API listening on 0.0.0.0:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`  FRONTEND_URL        = ${process.env.FRONTEND_URL ?? '(not set)'}`);
  console.log(`  YANDEX_REDIRECT_URI = ${process.env.YANDEX_REDIRECT_URI ?? '(not set)'}`);
  console.log(`  FLEX_BANK_BASE_URL  = ${process.env.FLEX_BANK_BASE_URL ?? '(not set)'}`);
}
bootstrap();
