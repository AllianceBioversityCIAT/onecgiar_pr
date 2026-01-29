import type { INestApplication } from '@nestjs/common';

describe('main bootstrap', () => {
  const runMain = async () => {
    jest.resetModules();

    const flushPromises = async (times = 5) => {
      for (let i = 0; i < times; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    };

    const useMock = jest.fn();
    const listenMock = jest.fn().mockResolvedValue(undefined);
    const enableVersioningMock = jest.fn();

    const nestAppMock: Partial<INestApplication> = {
      use: useMock,
      listen: listenMock as any,
      enableVersioning: enableVersioningMock as any,
    };

    const createMock = jest.fn().mockResolvedValue(nestAppMock);
    const microserviceListenMock = jest.fn().mockResolvedValue(undefined);
    const microserviceMock = {
      listen: microserviceListenMock,
    };
    const createMicroserviceMock = jest.fn().mockResolvedValue(microserviceMock);
    const documentBuilderChain = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addSecurity: jest.fn().mockReturnThis(),
      addSecurityRequirements: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ swagger: true }),
    };

    const createDocumentMock = jest.fn().mockReturnValue({ doc: true });
    const setupMock = jest.fn();

    const AppModuleMock = class AppModuleMock { };
    const AppMicroserviceModuleMock = class AppMicroserviceModuleMock { };

    jest.doMock('./app.module', () => ({ AppModule: AppModuleMock }));
    jest.doMock('./app-microservice.module', () => ({
      AppMicroserviceModule: AppMicroserviceModuleMock,
    }));
    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        create: createMock,
        createMicroservice: createMicroserviceMock,
      },
    }));
    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: jest.fn(() => documentBuilderChain),
      SwaggerModule: {
        createDocument: createDocumentMock,
        setup: setupMock,
      },
    }));
    jest.doMock('helmet', () => jest.fn(() => 'helmet-middleware'));
    jest.doMock('express', () => ({
      json: jest.fn(() => 'json-middleware'),
      urlencoded: jest.fn(() => 'urlencoded-middleware'),
    }));
    const actualCommon = jest.requireActual('@nestjs/common');
    jest.doMock('@nestjs/common', () => ({
      ...actualCommon,
      Logger: jest.fn(() => ({
        debug: jest.fn(),
        error: jest.fn(),
      })),
    }));

    process.env.PORT = '4500';

    await import('./main');
    // main.ts triggers bootstrap() without awaiting it; we need to flush the event loop
    // so both httpService() and microservice() complete before assertions.
    await flushPromises(10);

    return {
      AppModuleMock,
      AppMicroserviceModuleMock,
      createMock,
      createMicroserviceMock,
      microserviceListenMock,
      useMock,
      listenMock,
      enableVersioningMock,
      documentBuilderChain,
      createDocumentMock,
      setupMock,
    };
  };

  it('should create Nest application with AppModule and configure middlewares', async () => {
    const {
      AppModuleMock,
      AppMicroserviceModuleMock,
      createMock,
      createMicroserviceMock,
      microserviceListenMock,
      useMock,
      listenMock,
      enableVersioningMock,
      documentBuilderChain,
      createDocumentMock,
      setupMock,
    } = await runMain();

    expect(createMock).toHaveBeenCalledWith(AppModuleMock, {
      cors: true,
    });
    expect(createMicroserviceMock).toHaveBeenCalledWith(AppMicroserviceModuleMock, {
      transport: expect.anything(),
      options: expect.anything(),
    });
    expect(useMock).toHaveBeenCalledWith('json-middleware');
    expect(useMock).toHaveBeenCalledWith('urlencoded-middleware');
    expect(useMock).toHaveBeenCalledWith('helmet-middleware');
    expect(enableVersioningMock).toHaveBeenCalledWith({
      type: expect.anything(),
    });

    expect(documentBuilderChain.setTitle).toHaveBeenCalledWith(
      'PRMS Reporting API',
    );
    expect(createDocumentMock).toHaveBeenCalled();
    expect(setupMock).toHaveBeenCalledWith(
      'api',
      expect.anything(),
      {
        doc: true,
      },
      {
        swaggerOptions: { filter: true },
      },
    );
    expect(listenMock).toHaveBeenCalledWith('4500');
    expect(microserviceListenMock).toHaveBeenCalledTimes(1);
  });
});
