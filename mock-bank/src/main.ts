import dns from 'node:dns';
import net from 'node:net';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// ── Network reliability fixes for Railway ──────────────────
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamilyAttemptTimeout?.(100);

async function bootstrap() {
  console.log('[bootstrap] Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Mock Bank API')
    .setDescription('Mock bank service (Flex Bank) for SpaceSub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  const env = process.env.NODE_ENV || 'development';
  console.log(`Mock Bank (Flex Bank) API listening on 0.0.0.0:${port} [${env}]`);
  console.log(`Swagger docs: /api/docs`);
  console.log(`  FRONTEND_URL        = ${process.env.FRONTEND_URL ?? '(not set)'}`);
  console.log(`  YANDEX_REDIRECT_URI = ${process.env.YANDEX_REDIRECT_URI ?? '(not set)'}`);

  // ── Keep-alive self-ping — prevent Railway from sleeping ──
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    const selfUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`;
    const INTERVAL = 4 * 60 * 1000;
    setInterval(() => {
      fetch(selfUrl).catch(() => {});
    }, INTERVAL);
    console.log(`[keep-alive] self-ping every 4m → ${selfUrl}`);
  }
}
bootstrap().catch((err) => {
  console.error('Failed to start NestJS application:', err);
  process.exit(1);
});
