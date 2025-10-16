import { of, throwError } from 'rxjs';
import { Logger } from '@nestjs/common';
import { ClarisaApiConnection } from './clarisa.connection';

const originalEnv = { ...process.env };

describe('ClarisaApiConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLA_URL = 'https://clarisa.example/';
    process.env.CLA_USER = 'user';
    process.env.CLA_PASSWORD = 'pass';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should perform POST requests with merged authentication config', async () => {
    const httpService = {
      post: jest.fn().mockReturnValue(
        of({
          data: { success: true },
        }),
      ),
    } as any;

    const connection = new ClarisaApiConnection(httpService);

    const response = await connection.post(
      'resources',
      { id: 1 },
      {
        params: { filter: 'all' },
        headers: { 'x-test': 'true' },
      },
    );

    expect(response).toEqual({ success: true });
    expect(httpService.post).toHaveBeenCalledWith(
      'https://clarisa.example/api/resources',
      { id: 1 },
      expect.objectContaining({
        auth: { username: 'user', password: 'pass' },
        params: { filter: 'all' },
        headers: { 'x-test': 'true' },
      }),
    );
  });

  it('should log and return null when GET request fails', async () => {
    const httpService = {
      get: jest
        .fn()
        .mockReturnValue(throwError(() => new Error('network error'))),
    } as any;
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const connection = new ClarisaApiConnection(httpService);
    const response = await connection.get('fail');

    expect(response).toBeNull();
    expect(httpService.get).toHaveBeenCalledWith(
      'https://clarisa.example/api/fail',
      expect.objectContaining({ auth: { username: 'user', password: 'pass' } }),
    );
    expect(errorSpy).toHaveBeenCalled();
  });
});
