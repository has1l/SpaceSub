import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App — OAuth (e2e)', () => {
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

  it('OAuth URL should include state with spacesub_ prefix', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    const url = new URL(res.headers.location);
    const state = url.searchParams.get('state');
    expect(state).toMatch(/^spacesub_/);
  });

  it('OAuth URL should include force_confirm and prompt=select_account', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    const location = res.headers.location;
    expect(location).toContain('force_confirm=true');
    expect(location).toContain('prompt=select_account');
  });

  it('OAuth URL should include scope', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/yandex')
      .expect(302);
    expect(res.headers.location).toContain('scope=');
  });

  it('GET /auth/yandex/callback without state should return 400', async () => {
    await request(app.getHttpServer())
      .get('/auth/yandex/callback?code=test-code')
      .expect(400);
  });

  it('GET /auth/yandex/callback with invalid state should return 400', async () => {
    await request(app.getHttpServer())
      .get('/auth/yandex/callback?code=test-code&state=flexbank_wrong')
      .expect(400);
  });

  it('each /auth/yandex call should generate unique state', async () => {
    const res1 = await request(app.getHttpServer()).get('/auth/yandex');
    const res2 = await request(app.getHttpServer()).get('/auth/yandex');
    const state1 = new URL(res1.headers.location).searchParams.get('state');
    const state2 = new URL(res2.headers.location).searchParams.get('state');
    expect(state1).not.toBe(state2);
  });
});
