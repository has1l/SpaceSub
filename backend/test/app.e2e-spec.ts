import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /auth/yandex should redirect to Yandex OAuth', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    expect(res.headers.location).toContain('oauth.yandex.ru');
  });
});
