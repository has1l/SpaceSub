import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Mock Bank API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const testUserId = 'e2e-test-' + Date.now();
  let accountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const jwtService = app.get(JwtService);

    await prisma.user.create({
      data: {
        id: testUserId,
        yandexId: 'e2e-yandex-' + Date.now(),
        email: `e2e-${Date.now()}@test.com`,
        name: 'E2E Bank User',
      },
    });

    token = jwtService.sign({ sub: testUserId, email: 'e2e@test.com' });
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { account: { userId: testUserId } } });
    await prisma.account.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('Auth', () => {
    it('GET /auth/yandex should redirect', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      expect(res.headers.location).toContain('oauth.yandex.ru');
    });

    it('OAuth redirect_uri should use flexbank.localhost domain', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      const location = res.headers.location;
      expect(location).toContain('flexbank.localhost');
      expect(location).not.toContain('spacesub.localhost');
    });

    it('OAuth URL should include prompt=select_account', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      expect(res.headers.location).toContain('prompt=select_account');
    });

    it('should reject unauthorized requests', async () => {
      await request(app.getHttpServer()).get('/accounts').expect(401);
    });
  });

  describe('Accounts', () => {
    it('POST /accounts should create an account', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Тест', currency: 'RUB', balance: 50000 })
        .expect(201);

      expect(res.body.name).toBe('Тест');
      expect(res.body.balance).toBe(50000);
      accountId = res.body.id;
    });

    it('GET /accounts should return accounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].name).toBe('Тест');
    });

    it('POST /accounts should validate input', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ bad: 'data' })
        .expect(400);
    });
  });

  describe('Transactions', () => {
    it('POST /accounts/:id/transactions should create a transaction', async () => {
      const res = await request(app.getHttpServer())
        .post(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2026-01-15T00:00:00.000Z',
          amount: -799,
          description: 'NETFLIX.COM',
        })
        .expect(201);

      expect(res.body.amount).toBe(-799);
      expect(res.body.description).toBe('NETFLIX.COM');
    });

    it('GET /accounts/:id/transactions should return transactions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('GET /accounts/:id/transactions with date filter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/transactions?from=2026-01-01&to=2026-01-31`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('GET /transactions should return all user transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].account).toBeDefined();
    });

    it('should return 404 for non-existent account', async () => {
      await request(app.getHttpServer())
        .get('/accounts/nonexistent/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should validate transaction body', async () => {
      await request(app.getHttpServer())
        .post(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bad: 'data' })
        .expect(400);
    });
  });

  describe('API v1 (Bank Integration)', () => {
    it('GET /api/v1/accounts — requires auth', async () => {
      await request(app.getHttpServer()).get('/api/v1/accounts').expect(401);
    });

    it('GET /api/v1/accounts — returns bank-style DTOs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('externalId');
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('currency');
      expect(res.body[0]).toHaveProperty('balance');
    });

    it('GET /api/v1/accounts/:id/transactions — returns bank-style DTOs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('externalId');
      expect(res.body[0]).toHaveProperty('accountExternalId');
      expect(res.body[0]).toHaveProperty('postedAt');
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0].type).toBe('DEBIT');
      expect(typeof res.body[0].amount).toBe('number');
    });

    it('GET /api/v1/accounts/:id/transactions — date filtering', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/accounts/${accountId}/transactions?from=2026-01-01&to=2026-01-31`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
    });

    it('GET /api/v1/accounts/:id/transactions — 404 for wrong account', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/accounts/nonexistent/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
