import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { testModule, usePipes } from '../../test.module';

describe('Results Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();
    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  it('/auth/user/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/auth/user/' + 30)
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('statusCode');
        const response = data.response;
        expect(response).toHaveProperty('email');
      });
  });

  it('/auth/singin (POST)', async () => {
    return await request(app.getHttpServer())
      .post('/auth/singin')
      .send({
        email: 'test@jest.com',
        password: '12345678',
      })
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect(202)
      .expect((res) => {
        console.log(res);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
