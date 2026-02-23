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

  it('POST /bank-integration/flex/sync — creates sync log (stub)', async () => {
    const res = await request(app.getHttpServer())
      .post('/bank-integration/flex/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(res.body).toEqual({
      ok: true,
      imported: 0,
      suggestionsCreated: 0,
    });
  });

  it('POST /bank-integration/flex/connect — validation rejects empty body', () => {
    return request(app.getHttpServer())
      .post('/bank-integration/flex/connect')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
