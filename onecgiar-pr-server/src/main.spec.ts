import type { INestApplication } from '@nestjs/common';

describe('main bootstrap', () => {
  // Explicit, non-secret dummy values — set before `runMain()` so `dotenv/config` (imported by
  // `main.ts`) never overwrites them (dotenv does not clobber an already-set `process.env` key).
  // This makes the AI/reporting queue configuration deterministic in CI, where no `.env` exists,
  // instead of depending on whatever `.env` happens to be on the developer's machine
  // (Reviewer FAIL, attempt 1: assertions were gated behind `.env`-derived flags and never ran
  // in CI).
  const ENV_KEYS = [
    'RABBITMQ_URL',
    'BILATERAL_AI_PROCESSING_QUEUE',
    'REPORTING_METADATA_EXPORT_QUEUE',
    'BILATERAL_AI_MAX_CONCURRENT',
    'PORT',
  ] as const;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  const runMain = async () => {
    jest.resetModules();

    const useMock = jest.fn();
    const listenMock = jest.fn().mockResolvedValue(undefined);
    const enableVersioningMock = jest.fn();

    const connectMicroserviceMock = jest.fn();
    const startAllMicroservicesMock = jest.fn().mockResolvedValue(undefined);

    const nestAppMock: Partial<INestApplication> = {
      use: useMock,
      listen: listenMock as any,
      enableVersioning: enableVersioningMock as any,
      connectMicroservice: connectMicroserviceMock as any,
      startAllMicroservices: startAllMicroservicesMock as any,
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
      connectMicroserviceMock,
      startAllMicroservicesMock,
      documentBuilderChain,
      createDocumentMock,
      setupMock,
    };
  };

  it('should create Nest application with AppModule and configure middlewares, wiring both microservices with the caps-driven prefetchCount', async () => {
    process.env.RABBITMQ_URL = 'amqp://test-rabbitmq';
    process.env.BILATERAL_AI_PROCESSING_QUEUE = 'test_bilateral_ai_processing';
    process.env.REPORTING_METADATA_EXPORT_QUEUE =
      'test_reporting_metadata_export';
    // A non-default value so a regression to a hardcoded `prefetchCount: 2` (equal to the
    // getter's own default) would still be caught.
    process.env.BILATERAL_AI_MAX_CONCURRENT = '3';

    const {
      AppModuleMock,
      createMock,
      useMock,
      listenMock,
      enableVersioningMock,
      connectMicroserviceMock,
      startAllMicroservicesMock,
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

    // Both queues are configured above (unconditionally, not `.env`-derived) so both connects
    // MUST happen and MUST be observed in every run, including CI with no `.env` present.
    expect(connectMicroserviceMock).toHaveBeenCalledTimes(2);
    expect(startAllMicroservicesMock).toHaveBeenCalled();

    const connectedOptions: Array<{ queue: string; prefetchCount: number }> =
      connectMicroserviceMock.mock.calls.map(
        ([config]: [{ options: { queue: string; prefetchCount: number } }]) =>
          config.options,
      );

    const reportingOptions = connectedOptions.find(
      (options) => options.queue === 'test_reporting_metadata_export',
    );
    expect(reportingOptions).toBeDefined();
    // The reporting-export block keeps its own literal `1` (`AIQ-R-21`/design.md §5.6) — it
    // must NOT change when the AI global cap changes.
    expect(reportingOptions.prefetchCount).toBe(1);

    const aiOptions = connectedOptions.find(
      (options) => options.queue === 'test_bilateral_ai_processing',
    );
    expect(aiOptions).toBeDefined();
    // `AIQ-R-21`/design.md §5.6: the AI queue's prefetchCount comes from the global-cap getter
    // (here driven to `3` via `BILATERAL_AI_MAX_CONCURRENT`), not a hardcoded literal.
    expect(aiOptions.prefetchCount).toBe(3);
  });

  it('does not connect any microservice when neither queue is configured', async () => {
    // Set to `''`, not `delete` — `main.ts` runs `import 'dotenv/config'`, which only skips
    // keys already present in `process.env` (even empty ones). Deleting the key would let
    // dotenv repopulate it from whatever `.env` happens to exist on this machine, silently
    // undoing "unconfigured" (the same class of env-dependence the Reviewer flagged).
    process.env.RABBITMQ_URL = '';
    process.env.BILATERAL_AI_PROCESSING_QUEUE = '';
    process.env.REPORTING_METADATA_EXPORT_QUEUE = '';
    process.env.BILATERAL_AI_MAX_CONCURRENT = '';

    const { connectMicroserviceMock, startAllMicroservicesMock } =
      await runMain();

    expect(connectMicroserviceMock).not.toHaveBeenCalled();
    expect(startAllMicroservicesMock).not.toHaveBeenCalled();
  });
});
