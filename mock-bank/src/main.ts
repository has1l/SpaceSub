import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
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

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const env = process.env.NODE_ENV || 'development';
  console.log(`Mock Bank (Flex Bank) API listening on 0.0.0.0:${port} [${env}]`);
  console.log(`Swagger docs: /api/docs`);
  console.log(`  FRONTEND_URL        = ${process.env.FRONTEND_URL ?? '(not set)'}`);
  console.log(`  YANDEX_REDIRECT_URI = ${process.env.YANDEX_REDIRECT_URI ?? '(not set)'}`);
}
bootstrap();
