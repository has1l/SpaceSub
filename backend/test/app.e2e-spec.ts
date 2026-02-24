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

  it('OAuth redirect_uri should use spacesub.localhost domain', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    const location = res.headers.location;
    expect(location).toContain('spacesub.localhost');
    expect(location).not.toContain('flexbank.localhost');
  });

  it('OAuth URL should include prompt=select_account', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    expect(res.headers.location).toContain('prompt=select_account');
  });
});
