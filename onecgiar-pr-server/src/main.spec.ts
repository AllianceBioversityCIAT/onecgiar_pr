import type { INestApplication } from '@nestjs/common';

describe('main bootstrap', () => {
  const runMain = async () => {
    jest.resetModules();

    const useMock = jest.fn();
    const listenMock = jest.fn().mockResolvedValue(undefined);
    const enableVersioningMock = jest.fn();

    const nestAppMock: Partial<INestApplication> = {
      use: useMock,
      listen: listenMock as any,
      enableVersioning: enableVersioningMock as any,
    };

    const createMock = jest.fn().mockResolvedValue(nestAppMock);
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

    const AppModuleMock = class AppModuleMock {};

    jest.doMock('./app.module', () => ({ AppModule: AppModuleMock }));
    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        create: createMock,
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
    await Promise.resolve();

    return {
      AppModuleMock,
      createMock,
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
      createMock,
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
  });
});
