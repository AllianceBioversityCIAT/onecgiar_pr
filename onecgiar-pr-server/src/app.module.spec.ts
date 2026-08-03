import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { JwtMiddleware } from './auth/Middlewares/jwt.middleware';
import { apiVersionMiddleware } from './shared/middleware/api-versioning.middleware';

describe('AppModule metadata', () => {
  it('should declare AppController', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      AppModule,
    ) as unknown[];
    expect(controllers).toEqual(expect.arrayContaining([AppController]));
  });

  it('should configure middlewares for api and type-one-report routes', () => {
    const module = new AppModule();

    const firstChain = {
      exclude: jest.fn().mockReturnThis(),
      forRoutes: jest.fn().mockReturnThis(),
    };
    const secondChain = {
      forRoutes: jest.fn().mockReturnThis(),
    };

    const consumer = {
      apply: jest
        .fn()
        .mockReturnValueOnce(firstChain)
        .mockReturnValueOnce(secondChain),
    } as any;

    module.configure(consumer);

    expect(consumer.apply).toHaveBeenNthCalledWith(
      1,
      JwtMiddleware,
      apiVersionMiddleware,
    );
    expect(firstChain.exclude).toHaveBeenCalledWith(
      {
        path: 'api/platform-report/*path',
        method: RequestMethod.ALL,
      },
      {
        path: 'api/bilateral',
        method: RequestMethod.ALL,
      },
      {
        path: 'api/bilateral/create',
        method: RequestMethod.ALL,
      },
      {
        path: 'api/bilateral/list',
        method: RequestMethod.ALL,
      },
      {
        path: 'api/bilateral/results',
        method: RequestMethod.ALL,
      },
      {
        path: 'api/bilateral/:id',
        method: RequestMethod.ALL,
      },
    );
    expect(firstChain.forRoutes).toHaveBeenCalledWith(
      {
        path: 'api/*path',
        method: RequestMethod.ALL,
      },
      {
        path: 'v2/*path',
        method: RequestMethod.ALL,
      },
      {
        path: 'clarisa/*path',
        method: RequestMethod.ALL,
      },
      {
        path: 'toc/*path',
        method: RequestMethod.ALL,
      },
    );

    expect(consumer.apply).toHaveBeenNthCalledWith(2, JwtMiddleware);
    expect(secondChain.forRoutes).toHaveBeenCalledWith({
      path: 'type-one-report',
      method: RequestMethod.ALL,
    });
  });
});
