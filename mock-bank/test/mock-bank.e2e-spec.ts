import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

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

    it('OAuth redirect_uri should use gateway host', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      const location = res.headers.location;
      expect(location).toContain('localhost');
      expect(location).toContain('%2Fbank-api%2Fauth%2Fyandex%2Fcallback');
      expect(location).not.toContain('spacesub.localhost');
    });

    it('OAuth URL should include state with flexbank_ prefix', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      const url = new URL(res.headers.location);
      const state = url.searchParams.get('state');
      expect(state).toMatch(/^flexbank_/);
    });

    it('OAuth URL should include force_confirm and prompt=select_account', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/yandex')
        .expect(302);
      const location = res.headers.location;
      expect(location).toContain('force_confirm=true');
      expect(location).toContain('prompt=select_account');
    });

    it('GET /auth/yandex/callback without state should return 400', async () => {
      await request(app.getHttpServer())
        .get('/auth/yandex/callback?code=test-code')
        .expect(400);
    });

    it('GET /auth/yandex/callback with spacesub state should return 400', async () => {
      await request(app.getHttpServer())
        .get('/auth/yandex/callback?code=test-code&state=spacesub_wrong')
        .expect(400);
    });

    it('should reject unauthorized requests', async () => {
      await request(app.getHttpServer()).get('/accounts').expect(401);
    });
  });

  describe('Accounts', () => {
    it('POST /accounts should create an account with initialBalance', async () => {
      const res = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Тест', currency: 'RUB', initialBalance: 50000 })
        .expect(201);

      expect(res.body.name).toBe('Тест');
      expect(res.body.initialBalance).toBe(50000);
      accountId = res.body.id;
    });

    it('GET /accounts should return accounts with computed balance', async () => {
      const res = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('balance');
      expect(res.body[0]).toHaveProperty('initialBalance');
    });

    it('GET /accounts/:id/summary should return summary', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/summary`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalIncome');
      expect(res.body).toHaveProperty('totalExpense');
      expect(res.body).toHaveProperty('expenseByCategory');
      expect(res.body).toHaveProperty('transactionCount');
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
    it('POST should create expense with negative amount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2026-01-15T00:00:00.000Z',
          amount: -799,
          description: 'NETFLIX.COM',
          merchant: 'Netflix',
          type: 'EXPENSE',
          category: 'SUBSCRIPTIONS',
        })
        .expect(201);

      expect(res.body.amount).toBe(-799);
      expect(res.body.type).toBe('EXPENSE');
      expect(res.body.category).toBe('SUBSCRIPTIONS');
      expect(res.body.merchant).toBe('Netflix');
    });

    it('POST should auto-convert positive amount to negative for EXPENSE', async () => {
      const res = await request(app.getHttpServer())
        .post(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2026-01-20T00:00:00.000Z',
          amount: 500,
          description: 'Spotify',
          type: 'EXPENSE',
          category: 'SUBSCRIPTIONS',
        })
        .expect(201);

      expect(res.body.amount).toBe(-500);
    });

    it('POST should create income with positive amount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: '2026-02-01T00:00:00.000Z',
          amount: 100000,
          description: 'Salary',
          type: 'INCOME',
        })
        .expect(201);

      expect(res.body.amount).toBe(100000);
      expect(res.body.type).toBe('INCOME');
    });

    it('GET should return transactions with category and type', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0]).toHaveProperty('category');
    });

    it('GET with date filter', async () => {
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}/transactions?from=2026-01-01&to=2026-01-31`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(2); // NETFLIX + Spotify
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

    it('balance should reflect transactions', async () => {
      const res = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const acc = res.body.find((a: any) => a.id === accountId);
      // initialBalance=50000 + (-799) + (-500) + 100000 = 148701
      expect(acc.balance).toBe(148701);
    });
  });

  describe('Token Exchange', () => {
    it('POST /auth/token-exchange — rejects missing body', async () => {
      await request(app.getHttpServer())
        .post('/auth/token-exchange')
        .send({})
        .expect(400);
    });

    it('POST /auth/token-exchange — rejects empty string', async () => {
      await request(app.getHttpServer())
        .post('/auth/token-exchange')
        .send({ yandexAccessToken: '' })
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

    it('GET /api/v1/accounts/:id/transactions — returns DTOs with category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('externalId');
      expect(res.body[0]).toHaveProperty('accountExternalId');
      expect(res.body[0]).toHaveProperty('postedAt');
      expect(res.body[0]).toHaveProperty('type');
      expect(res.body[0]).toHaveProperty('category');
      expect(typeof res.body[0].amount).toBe('number');
    });

    it('GET /api/v1/accounts/:id/transactions — DEBIT type for expense', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/accounts/${accountId}/transactions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const debit = res.body.find((t: any) => t.amount < 0);
      expect(debit.type).toBe('DEBIT');
    });

    it('GET /api/v1/accounts/:id/transactions — date filtering', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/accounts/${accountId}/transactions?from=2026-01-01&to=2026-01-31`,
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(2);
    });

    it('GET /api/v1/accounts/:id/transactions — 404 for wrong account', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/accounts/nonexistent/transactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('Connection Code', () => {
    let generatedCode: string;

    it('POST /connection-code — requires auth', async () => {
      await request(app.getHttpServer())
        .post('/connection-code')
        .expect(401);
    });

    it('POST /connection-code — generates a code', async () => {
      const res = await request(app.getHttpServer())
        .post('/connection-code')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('expiresAt');
      expect(res.body.code).toMatch(/^FB-[A-Z0-9]{6}$/);
      expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
      generatedCode = res.body.code;
    });

    it('POST /connection-code/redeem — rejects missing codeHash', async () => {
      await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({})
        .expect(400);
    });

    it('POST /connection-code/redeem — rejects non-existent code', async () => {
      const fakeHash = createHash('sha256').update('FB-XXXXXX').digest('hex');
      await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash: fakeHash })
        .expect(401);
    });

    it('POST /connection-code/redeem — redeems valid code', async () => {
      const codeHash = createHash('sha256').update(generatedCode).digest('hex');
      const res = await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.length).toBeGreaterThan(10);
    });

    it('POST /connection-code/redeem — rejects already used code', async () => {
      const codeHash = createHash('sha256').update(generatedCode).digest('hex');
      await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash })
        .expect(401);
    });

    it('POST /connection-code/redeem — code does not expose plaintext in response', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/connection-code')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const codeHash = createHash('sha256').update(genRes.body.code).digest('hex');
      const redeemRes = await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash })
        .expect(201);

      expect(Object.keys(redeemRes.body)).toEqual(['accessToken']);
    });

    it('POST /connection-code/redeem — blocks after 5 failed attempts', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/connection-code')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const correctHash = createHash('sha256').update(genRes.body.code).digest('hex');

      await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash: correctHash })
        .expect(201);

      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/connection-code/redeem')
          .send({ codeHash: correctHash })
          .expect(401);
      }

      await request(app.getHttpServer())
        .post('/connection-code/redeem')
        .send({ codeHash: correctHash })
        .expect(403);
    });
  });
});
