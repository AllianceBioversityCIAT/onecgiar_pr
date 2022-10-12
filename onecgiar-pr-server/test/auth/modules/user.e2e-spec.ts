import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { testModule, usePipes } from '../../test.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await testModule.compile();

    app = moduleFixture.createNestApplication();
    usePipes(app);
    await app.init();
  });

  // Deberia retornar un status 200 y como minimo deberia email al enviar un id de tipo number
  it('/auth/user/:id', () => {
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

  // Deberia retornar un status 404 si el id es de tipo string o deberia retornar un mensaje de error
  it('/auth/user/:id', () => {
    return request(app.getHttpServer())
      .get('/auth/user/' + 0)
      .expect(200)
      .expect((res) => {
        const data = res.body;
        expect(data.response).toEqual({});
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
