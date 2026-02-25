import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Bank Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  const testUserId = 'e2e-bank-user-' + Date.now();

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
        yandexId: 'e2e-bank-yandex-' + Date.now(),
        email: `e2e-bank-${Date.now()}@test.com`,
        name: 'E2E Bank Test User',
      },
    });

    token = jwtService.sign({ sub: testUserId, email: 'e2e-bank@test.com' });
  });

  afterAll(async () => {
    await prisma.bankSyncLog.deleteMany({
      where: { connection: { userId: testUserId } },
    });
    await prisma.bankConnection.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  it('POST /bank-integration/flex/connect — 401 without token', () => {
    return request(app.getHttpServer())
      .post('/bank-integration/flex/connect')
      .send({ accessToken: 'tok' })
      .expect(401);
  });

  it('POST /bank-integration/flex/connect — creates connection', async () => {
    const res = await request(app.getHttpServer())
      .post('/bank-integration/flex/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({ accessToken: 'my-access-token' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('provider', 'FLEX');
    expect(res.body).toHaveProperty('status', 'CONNECTED');
    expect(res.body).not.toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  it('GET /bank-integration/connections — returns connections', async () => {
    const res = await request(app.getHttpServer())
      .get('/bank-integration/connections')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('provider', 'FLEX');
    expect(res.body[0]).not.toHaveProperty('accessToken');
  });

  it('POST /bank-integration/flex/sync — fails gracefully when Flex Bank is unreachable', async () => {
    // Real sync requires mock-bank to be running; without it we expect an error
    const res = await request(app.getHttpServer())
      .post('/bank-integration/flex/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(500);

    expect(res.body).toHaveProperty('statusCode', 500);
  });

  it('POST /bank-integration/flex/connect — validation rejects empty body', () => {
    return request(app.getHttpServer())
      .post('/bank-integration/flex/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  // ── Bank OAuth endpoints ──────────────────────────────

  it('GET /bank-integration/flex/oauth — 401 without token', () => {
    return request(app.getHttpServer())
      .get('/bank-integration/flex/oauth')
      .expect(401);
  });

  it('GET /bank-integration/flex/oauth — returns Yandex OAuth URL', async () => {
    const res = await request(app.getHttpServer())
      .get('/bank-integration/flex/oauth')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('url');
    expect(res.body.url).toContain('https://oauth.yandex.ru/authorize');
    expect(res.body.url).toContain('state=flexoauth_');
    expect(res.body.url).toContain('force_confirm=true');
    expect(res.body.url).toContain('prompt=select_account');
    expect(res.body.url).toContain('redirect_uri=');
    expect(res.body.url).toContain('bank-integration%2Fflex%2Fcallback');
  });

  it('GET /bank-integration/flex/callback — rejects missing state', async () => {
    const res = await request(app.getHttpServer())
      .get('/bank-integration/flex/callback?code=test-code')
      .expect(400);

    expect(res.body.message).toContain('Missing code or state');
  });

  it('GET /bank-integration/flex/callback — rejects invalid state', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/bank-integration/flex/callback?code=test-code&state=invalid-state',
      )
      .expect(302);

    // Should redirect to frontend with error
    expect(res.headers.location).toContain('error=oauth_failed');
  });

  it('GET /bank-integration/flex/callback — rejects spacesub state prefix', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/bank-integration/flex/callback?code=test-code&state=spacesub_fake-uuid',
      )
      .expect(302);

    expect(res.headers.location).toContain('error=oauth_failed');
  });
});
