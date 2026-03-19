import dns from 'node:dns';
import net from 'node:net';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

// ── Network reliability fixes for Railway ──────────────────
// 1. Force IPv4 — Railway containers have no IPv6 egress
dns.setDefaultResultOrder('ipv4first');
// 2. Reduce IPv6 fallback wait from 250ms to 100ms (Node 20+ happy eyeballs)
net.setDefaultAutoSelectFamilyAttemptTimeout?.(100);

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

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = [
        'http://localhost:5174',
        'http://localhost:5173',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
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

  // ── Keep-alive self-ping — prevent Railway from sleeping ──
  // Railway sleeps containers after ~10 min of no outbound traffic.
  // A self-ping every 4 min keeps the container warm for OAuth flows.
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const selfUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api`;
    const INTERVAL = 4 * 60 * 1000; // 4 minutes
    setInterval(() => {
      fetch(selfUrl).catch(() => {});
    }, INTERVAL);
    console.log(`[keep-alive] self-ping every 4m → ${selfUrl}`);
  }
}
bootstrap();
