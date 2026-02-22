import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Transactions & Suggestions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const testUserId = 'e2e-test-user-' + Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService);

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        yandexId: 'e2e-yandex-' + Date.now(),
        email: `e2e-${Date.now()}@test.com`,
        name: 'E2E Test User',
      },
    });

    token = jwtService.sign({ sub: testUserId, email: 'e2e@test.com' });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.subscription.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('POST /transactions/import', () => {
    it('should import transactions and return suggestions', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transactions: [
            { amount: 799, date: '2025-01-15T00:00:00.000Z', description: 'NETFLIX.COM' },
            { amount: 799, date: '2025-02-15T00:00:00.000Z', description: 'NETFLIX.COM' },
            { amount: 799, date: '2025-03-15T00:00:00.000Z', description: 'NETFLIX.COM' },
            { amount: 799, date: '2025-04-15T00:00:00.000Z', description: 'NETFLIX.COM' },
            { amount: 300, date: '2025-01-01T00:00:00.000Z', description: 'RANDOM' },
          ],
        })
        .expect(201);

      expect(res.body.imported).toBe(5);
      expect(res.body.suggestions).toBeDefined();
      expect(res.body.suggestions.length).toBe(1);
      expect(res.body.suggestions[0].name).toBe('NETFLIX.COM');
      expect(res.body.suggestions[0].amount).toBe(799);
      expect(res.body.suggestions[0].billingCycle).toBe('MONTHLY');
      expect(res.body.suggestions[0].score).toBeGreaterThan(0.5);
    });

    it('should reject empty transactions array', async () => {
      await request(app.getHttpServer())
        .post('/transactions/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ transactions: [] })
        .expect(400);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/transactions/import')
        .send({ transactions: [{ amount: 100, date: '2025-01-01T00:00:00.000Z', description: 'X' }] })
        .expect(401);
    });
  });

  describe('POST /transactions/analyze', () => {
    it('should return suggestions for existing transactions', async () => {
      const res = await request(app.getHttpServer())
        .post('/transactions/analyze')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('suggestionId');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('amount');
      expect(res.body[0]).toHaveProperty('billingCycle');
      expect(res.body[0]).toHaveProperty('score');
      expect(res.body[0]).toHaveProperty('transactionIds');
    });
  });

  describe('GET /subscriptions/suggestions', () => {
    it('should return suggestions', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscriptions/suggestions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /subscriptions/suggestions/:id/confirm', () => {
    it('should create subscription from suggestion', async () => {
      // First get suggestions to get a valid ID
      const suggestionsRes = await request(app.getHttpServer())
        .get('/subscriptions/suggestions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const suggestionId = suggestionsRes.body[0].suggestionId;
      const txCount = suggestionsRes.body[0].transactionCount;

      const res = await request(app.getHttpServer())
        .post(`/subscriptions/suggestions/${suggestionId}/confirm`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.name).toBe('NETFLIX.COM');
      expect(res.body.subscription.billingCycle).toBe('MONTHLY');
      expect(res.body.linkedTransactions).toBe(txCount);
    });

    it('should return 404 for invalid suggestion ID', async () => {
      await request(app.getHttpServer())
        .post('/subscriptions/suggestions/nonexistent-id/confirm')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should not show confirmed suggestion anymore', async () => {
      const res = await request(app.getHttpServer())
        .get('/subscriptions/suggestions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Netflix was confirmed, should not appear
      const netflix = res.body.find((s: any) => s.name === 'NETFLIX.COM');
      expect(netflix).toBeUndefined();
    });
  });
});
