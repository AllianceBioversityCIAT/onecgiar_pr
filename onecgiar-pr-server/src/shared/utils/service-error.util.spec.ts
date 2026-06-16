import { HttpStatus } from '@nestjs/common';
import { formatUnknownError, throwServiceError } from './service-error.util';

describe('throwServiceError', () => {
  it('throws an Error with response and status fields', () => {
    expect(() =>
      throwServiceError('Not found', HttpStatus.NOT_FOUND),
    ).toThrow('Not found');

    try {
      throwServiceError('Bad input', HttpStatus.BAD_REQUEST);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as any).message).toBe('Bad input');
      expect((error as any).status).toBe(HttpStatus.BAD_REQUEST);
      expect((error as any).response).toEqual({});
    }
  });

  it('defaults to BAD_REQUEST status', () => {
    try {
      throwServiceError('Validation failed');
    } catch (error) {
      expect((error as any).status).toBe(HttpStatus.BAD_REQUEST);
    }
  });
});

describe('formatUnknownError', () => {
  it('returns message for Error instances', () => {
    expect(formatUnknownError(new Error('db failed'))).toBe('db failed');
  });

  it('stringifies plain objects instead of [object Object]', () => {
    expect(formatUnknownError({ code: 'ECONNREFUSED' })).toBe(
      '{"code":"ECONNREFUSED"}',
    );
  });
});
