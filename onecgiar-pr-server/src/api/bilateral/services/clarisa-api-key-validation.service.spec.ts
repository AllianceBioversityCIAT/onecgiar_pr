import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders } from 'axios';
import { ClarisaApiKeyValidationService } from './clarisa-api-key-validation.service';
import { BILATERAL_CLARISA_MICROSERVICE_NAME } from '../constants/bilateral-auth.constants';

const originalEnv = { ...process.env };

describe('ClarisaApiKeyValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLA_VALIDATE_URL = 'https://clarisa.example/';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createService = (httpService: HttpService) =>
    new ClarisaApiKeyValidationService(httpService);

  it('should validate API key against CLARISA without Basic Auth', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: {
          valid: true,
          mis: { id: 12, name: 'Reporting Tool', acronym: 'PRMS' },
          environment: 'PROD',
          scopes: ['bilateral:read'],
        },
      }),
    );
    const httpService = { post } as unknown as HttpService;

    const service = createService(httpService);
    const isValid = await service.validate(
      'cl_prod_key',
      '/api/bilateral/list',
      '203.0.113.42',
    );

    expect(isValid).toBe(true);
    expect(post).toHaveBeenCalledWith(
      'https://clarisa.example/api/auth/validate-api-key',
      {
        api_key: 'cl_prod_key',
        microservice_name: BILATERAL_CLARISA_MICROSERVICE_NAME,
        endpoint_accessed: '/api/bilateral/list',
        ip_address: '203.0.113.42',
      },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      }),
    );
    expect(post.mock.calls[0][2]).not.toHaveProperty('auth');
  });

  it('should return false when CLARISA responds with valid false', async () => {
    const httpService = {
      post: jest.fn().mockReturnValue(
        of({
          data: {
            valid: false,
            error: 'Invalid API key',
          },
        }),
      ),
    } as unknown as HttpService;

    const service = createService(httpService);
    await expect(
      service.validate('bad-key', '/api/bilateral/create'),
    ).resolves.toBe(false);
  });

  it('should return false when CLARISA responds with HTTP 401', async () => {
    const axiosError = new AxiosError(
      'Unauthorized',
      '401',
      undefined,
      undefined,
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { valid: false, error: 'Missing required scope' },
      },
    );

    const httpService = {
      post: jest.fn().mockReturnValue(throwError(() => axiosError)),
    } as unknown as HttpService;

    const service = createService(httpService);
    await expect(
      service.validate('bad-key', '/api/bilateral/results'),
    ).resolves.toBe(false);
  });

  it('should return false and log when CLARISA is unreachable', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const httpService = {
      post: jest
        .fn()
        .mockReturnValue(throwError(() => new Error('network error'))),
    } as unknown as HttpService;

    const service = createService(httpService);
    await expect(service.validate('some-key', '/api/bilateral')).resolves.toBe(
      false,
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
