import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ForecastModule } from './forecast/forecast.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationModule } from './integration/integration.module';
import { BankIntegrationModule } from './bank-integration/bank-integration.module';
import { DetectedSubscriptionsModule } from './detected-subscriptions/detected-subscriptions.module';
import { AiInsightModule } from './ai-insight/ai-insight.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        YANDEX_CLIENT_ID: Joi.string().required(),
        YANDEX_CLIENT_SECRET: Joi.string().required(),
        YANDEX_REDIRECT_URI: Joi.string().required(),
        FRONTEND_URL: Joi.string().default('http://localhost:5174'),
        FLEX_BANK_BASE_URL: Joi.string().default('http://localhost:3001'),
        FLEX_BANK_TIMEOUT_MS: Joi.number().default(8000),
        FLEX_BANK_OAUTH_CLIENT_ID: Joi.string().required(),
        FLEX_BANK_OAUTH_CLIENT_SECRET: Joi.string().required(),
        FLEX_BANK_OAUTH_REDIRECT_URI: Joi.string().required(),
        TOKEN_ENCRYPTION_KEY: Joi.string().hex().length(64).required(),
        OPENAI_API_KEY: Joi.string().optional().allow(''),
        PORT: Joi.number().default(3000),
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    TransactionsModule,
    AnalyticsModule,
    ForecastModule,
    NotificationsModule,
    IntegrationModule,
    BankIntegrationModule,
    DetectedSubscriptionsModule,
    AiInsightModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
