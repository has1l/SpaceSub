import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SubscriptionAnalyzerService } from '../src/bank-integration/services/subscription-analyzer.service';

describe('Subscription Analyzer after Sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let analyzer: SubscriptionAnalyzerService;
  let token: string;
  const testUserId = 'e2e-analyzer-' + Date.now();
  let connectionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    analyzer = app.get(SubscriptionAnalyzerService);
    const jwtService = app.get(JwtService);

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        yandexId: 'e2e-analyzer-yandex-' + Date.now(),
        email: `e2e-analyzer-${Date.now()}@test.com`,
        name: 'E2E Analyzer Test User',
      },
    });

    token = jwtService.sign({ sub: testUserId, email: 'e2e-analyzer@test.com' });

    // Create a bank connection
    const conn = await prisma.bankConnection.create({
      data: {
        userId: testUserId,
        provider: 'FLEX',
        accessToken: 'test-token',
        status: 'CONNECTED',
      },
    });
    connectionId = conn.id;
  });

  afterAll(async () => {
    await prisma.detectedSubscription.deleteMany({ where: { userId: testUserId } });
    await prisma.importedTransaction.deleteMany({ where: { userId: testUserId } });
    await prisma.bankSyncLog.deleteMany({ where: { connectionId } });
    await prisma.bankConnection.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('should detect subscription from 3 recurring expense transactions', async () => {
    // Insert 3 monthly NETFLIX transactions (-500 RUB each, ~30 days apart)
    const baseDate = new Date('2025-11-15');
    for (let i = 0; i < 3; i++) {
      const date = new Date(baseDate);
      date.setMonth(date.getMonth() + i);

      await prisma.importedTransaction.create({
        data: {
          userId: testUserId,
          connectionId,
          provider: 'FLEX',
          externalId: `netflix-${i}-${Date.now()}`,
          occurredAt: date,
          amount: -500,
          currency: 'RUB',
          description: 'NETFLIX.COM',
          merchant: 'Netflix',
          raw: {},
        },
      });
    }

    // Run the analyzer (simulating what syncFlex now does)
    const detected = await analyzer.analyzeForUser(testUserId);
    expect(detected).toBeGreaterThanOrEqual(1);

    // Verify via API: GET /detected-subscriptions/active
    const res = await request(app.getHttpServer())
      .get('/api/detected-subscriptions/active')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const netflix = res.body.find(
      (s: any) => s.merchant === 'Netflix' || s.merchant === 'NETFLIX.COM',
    );
    expect(netflix).toBeDefined();
    expect(netflix.amount).toBe(500);
    expect(netflix.isActive).toBe(true);
    expect(netflix.periodType).toBe('MONTHLY');
    expect(netflix.transactionCount).toBe(3);
  });

  it('should include subscription in summary', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/detected-subscriptions/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.activeCount).toBeGreaterThanOrEqual(1);
    expect(res.body.monthlyTotal).toBeGreaterThanOrEqual(500);
  });
});
