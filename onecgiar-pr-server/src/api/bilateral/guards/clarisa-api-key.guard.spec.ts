import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ClarisaApiKeyGuard } from './clarisa-api-key.guard';
import { BILATERAL_CLARISA_ENDPOINT_KEY } from '../decorators/bilateral-clarisa-endpoint.decorator';
import { BILATERAL_UNAUTHORIZED_MESSAGE } from '../constants/bilateral-auth.constants';

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

  const makeContext = (headers: Record<string, string | string[]>) =>
    ({
      getHandler: () => function handler() {},
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          socket: { remoteAddress: '127.0.0.1' },
        }),
      }),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.get.mockReturnValue('/api/bilateral/create');
  });

  it('should reject requests without X-API-Key', async () => {
    await expect(guard.canActivate(makeContext({}))).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
    expect(validationService.validate).not.toHaveBeenCalled();
  });

  it('should reject requests when endpoint metadata is missing', async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'cl_prod_key' })),
    ).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
    expect(validationService.validate).not.toHaveBeenCalled();
  });

  it('should allow requests when CLARISA validates the API key', async () => {
    validationService.validate.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        makeContext({
          'x-api-key': 'cl_prod_key',
          'x-forwarded-for': '203.0.113.42',
        }),
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

  it('should reject requests when CLARISA rejects the API key', async () => {
    validationService.validate.mockResolvedValue(false);

    await expect(
      guard.canActivate(makeContext({ 'x-api-key': 'bad-key' })),
    ).rejects.toThrow(
      new UnauthorizedException(BILATERAL_UNAUTHORIZED_MESSAGE),
    );
  });
});
