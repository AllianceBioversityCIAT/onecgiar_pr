import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ClarisaApiKeyGuard } from './clarisa-api-key.guard';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../decorators/bilateral-clarisa-endpoint.decorator';
import { BILATERAL_UNAUTHORIZED_MESSAGE } from '../constants/bilateral-auth.constants';
import { EXTERNAL_PLATFORM_REQUEST_KEY } from '../constants/external-platform.constants';
import {
  REQUIRE_CLARISA_ENDPOINT_GRANT_KEY,
  RequireClarisaEndpointGrant,
} from '../decorators/require-clarisa-endpoint-grant.decorator';
import { BilateralClarisaEndpoint } from '../decorators/bilateral-clarisa-endpoint.decorator';
import { BilateralController } from '../bilateral.controller';
import { BilateralHandoffController } from '../bilateral-handoff.controller';
import { QaCatalogController } from '../../qa-catalog/qa-catalog.controller';

describe('ClarisaApiKeyGuard', () => {
  const validationService = {
    validate: jest.fn(),
  };

  const reflector = {
    get: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  const guard = new ClarisaApiKeyGuard(
    validationService as any,
    reflector as unknown as Reflector,
  );

  /** Keeps one request object per context so a test can inspect what the guard attached to it. */
  const makeContext = (headers: Record<string, string | string[]>) => {
    const request: any = { headers, socket: { remoteAddress: '127.0.0.1' } };
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
    return { context, request };
  };

  /** What CLARISA returns for a valid key. */
  const validationSuccess = {
    valid: true as const,
    mis: { id: 12, name: 'Reporting Tool', acronym: 'PRMS' },
    environment: 'PROD',
    scopes: ['bilateral:create'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.get.mockReturnValue('/api/bilateral/create');
  });

  it('should reject requests without X-API-Key', async () => {
    await expect(guard.canActivate(makeContext({}).context)).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
    expect(validationService.validate).not.toHaveBeenCalled();
  });

  it('should reject requests when endpoint metadata is missing', async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'cl_prod_key' }).context),
    ).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
    expect(validationService.validate).not.toHaveBeenCalled();
  });

  it('should allow requests when CLARISA validates the API key', async () => {
    validationService.validate.mockResolvedValue(validationSuccess);

    await expect(
      guard.canActivate(
        makeContext({
          'x-api-key': 'cl_prod_key',
          'x-forwarded-for': '203.0.113.42',
        }).context,
      ),
    ).resolves.toBe(true);

    expect(reflector.get).toHaveBeenCalledWith(
      BILATERAL_CLARISA_ENDPOINT_KEY,
      expect.any(Function),
    );
    expect(validationService.validate).toHaveBeenCalledWith(
      'cl_prod_key',
      '/api/bilateral/create',
      '203.0.113.42',
    );
  });

  // P2-3166. Without this the calling system's identity dies in the guard, and a result created
  // through the API records *how* it arrived but never *from whom* — which is exactly what routing
  // a webhook back needs.
  describe('external platform identity (P2-3166)', () => {
    it('attaches the authenticated calling system to the request', async () => {
      validationService.validate.mockResolvedValue(validationSuccess);
      const { context, request } = makeContext({ 'x-api-key': 'cl_prod_key' });

      await guard.canActivate(context);

      expect(request[EXTERNAL_PLATFORM_REQUEST_KEY]).toEqual({
        id: 12,
        name: 'Reporting Tool',
        acronym: 'PRMS',
      });
    });

    it('attaches nothing when the key is rejected', async () => {
      validationService.validate.mockResolvedValue(null);
      const { context, request } = makeContext({ 'x-api-key': 'bad-key' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
      expect(request[EXTERNAL_PLATFORM_REQUEST_KEY]).toBeUndefined();
    });
  });

  it('should reject requests when CLARISA rejects the API key', async () => {
    validationService.validate.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'bad-key' }).context),
    ).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
  });
  describe('per-endpoint CLARISA grant (QIN-T-4b)', () => {
    // Real Reflector + real decorator metadata: stubbing the reflector would prove nothing.
    const realGuard = new ClarisaApiKeyGuard(
      validationService as any,
      new Reflector(),
    );

    class ProtectedController {
      @BilateralClarisaEndpoint('/api/qa/x')
      @RequireClarisaEndpointGrant()
      protectedHandler() {}

      @BilateralClarisaEndpoint('/api/bilateral/x')
      unprotectedHandler() {}
    }

    const ctxFor = (
      cls: any,
      handler: (...a: any[]) => any,
      headers: Record<string, string> = { 'x-api-key': 'cl_test_fixture' },
    ) => {
      const request: any = { headers, socket: { remoteAddress: '127.0.0.1' } };
      const context = {
        getHandler: () => handler,
        getClass: () => cls,
        switchToHttp: () => ({ getRequest: () => request }),
      } as any;
      return { context, request };
    };
    const protectedCtx = () =>
      ctxFor(
        ProtectedController,
        ProtectedController.prototype.protectedHandler,
      );

    const qaKey = {
      valid: true as const,
      api_key_id: 32,
      key_prefix: 'cl_test_fixture',
      environment: 'TEST',
      mis: { id: 30, name: 'Quality Assessment Platform', acronym: 'QA' },
      scopes: [],
    };

    it('(a) endpoint_allowed true -> pass and mis set on the request', async () => {
      validationService.validate.mockResolvedValue({
        ...qaKey,
        allowed_endpoints: ['/api/qa/x'],
        endpoint_allowed: true,
      });
      const { context, request } = protectedCtx();
      await expect(realGuard.canActivate(context)).resolves.toBe(true);
      expect(request[EXTERNAL_PLATFORM_REQUEST_KEY]).toEqual(qaKey.mis);
    });

    it('(b) endpoint_allowed false -> 401 generic body', async () => {
      validationService.validate.mockResolvedValue({
        ...qaKey,
        allowed_endpoints: ['/api/qa/other'],
        endpoint_allowed: false,
      });
      const { context, request } = protectedCtx();
      await expect(realGuard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
      expect(request[EXTERNAL_PLATFORM_REQUEST_KEY]).toBeUndefined();
    });

    it('(c) key without a list -> 401', async () => {
      validationService.validate.mockResolvedValue({
        ...qaKey,
        mis: { id: 12, name: 'Reporting Tool', acronym: 'PRMS' },
        allowed_endpoints: [],
        endpoint_allowed: false,
      });
      await expect(
        realGuard.canActivate(protectedCtx().context),
      ).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
    });

    it('(d) invalid key (validation null) -> 401', async () => {
      validationService.validate.mockResolvedValue(null);
      await expect(
        realGuard.canActivate(protectedCtx().context),
      ).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
    });

    it('(e) no endpoint_allowed field -> 401 protected, pass unprotected', async () => {
      validationService.validate.mockResolvedValue({ ...qaKey });
      await expect(
        realGuard.canActivate(protectedCtx().context),
      ).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
      const unprotected = ctxFor(
        ProtectedController,
        ProtectedController.prototype.unprotectedHandler,
      );
      await expect(realGuard.canActivate(unprotected.context)).resolves.toBe(
        true,
      );
    });

    it('a string "true" is refused (strict === true)', async () => {
      validationService.validate.mockResolvedValue({
        ...qaKey,
        endpoint_allowed: 'true',
      });
      await expect(
        realGuard.canActivate(protectedCtx().context),
      ).rejects.toThrow(
        new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
      );
    });

    it('(f) every QaCatalogController handler resolves the requirement to true (real metadata)', () => {
      const reflector = new Reflector();
      const handlers = Object.getOwnPropertyNames(
        QaCatalogController.prototype,
      ).filter(
        (n) =>
          n !== 'constructor' &&
          typeof (QaCatalogController.prototype as any)[n] === 'function',
      );
      expect(handlers).toHaveLength(5);
      for (const name of handlers) {
        expect(
          reflector.getAllAndOverride(REQUIRE_CLARISA_ENDPOINT_GRANT_KEY, [
            (QaCatalogController.prototype as any)[name],
            QaCatalogController,
          ]),
        ).toBe(true);
      }
    });

    it('(g) bilateral handlers do not require the grant', () => {
      const reflector = new Reflector();
      for (const cls of [BilateralController, BilateralHandoffController]) {
        const handlers = Object.getOwnPropertyNames(cls.prototype).filter(
          (n) =>
            n !== 'constructor' &&
            typeof (cls.prototype as any)[n] === 'function',
        );
        expect(handlers.length).toBeGreaterThan(0);
        for (const name of handlers) {
          expect(
            reflector.getAllAndOverride(REQUIRE_CLARISA_ENDPOINT_GRANT_KEY, [
              (cls.prototype as any)[name],
              cls,
            ]),
          ).toBeFalsy();
        }
      }
    });
  });
});
