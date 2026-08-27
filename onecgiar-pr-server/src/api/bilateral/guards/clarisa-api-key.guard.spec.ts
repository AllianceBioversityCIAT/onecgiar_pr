import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ClarisaApiKeyGuard } from './clarisa-api-key.guard';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../decorators/bilateral-clarisa-endpoint.decorator';
import { BILATERAL_UNAUTHORIZED_MESSAGE } from '../constants/bilateral-auth.constants';
import { EXTERNAL_PLATFORM_REQUEST_KEY } from '../constants/external-platform.constants';

describe('ClarisaApiKeyGuard', () => {
  const validationService = {
    validate: jest.fn(),
  };

  const reflector = {
    get: jest.fn(),
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
});
