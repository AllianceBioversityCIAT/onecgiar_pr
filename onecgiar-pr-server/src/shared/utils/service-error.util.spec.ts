import { HttpStatus } from '@nestjs/common';
import {
  formatUnknownError,
  throwServiceError,
  type ServiceError,
} from './service-error.util';

function expectServiceError(error: unknown): asserts error is ServiceError {
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) {
    throw new Error('Expected a ServiceError instance');
  }
}

describe('throwServiceError', () => {
  it('throws an Error with response and status fields', () => {
    expect(() => throwServiceError('Not found', HttpStatus.NOT_FOUND)).toThrow(
      'Not found',
    );

    try {
      throwServiceError('Bad input', HttpStatus.BAD_REQUEST);
    } catch (error) {
      expectServiceError(error);
      expect(error.message).toBe('Bad input');
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
      expect(error.response).toEqual({});
    }
  });

  it('defaults to BAD_REQUEST status', () => {
    try {
      throwServiceError('Validation failed');
    } catch (error) {
      expectServiceError(error);
      expect(error.status).toBe(HttpStatus.BAD_REQUEST);
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

  it('returns explicit literals for null and undefined', () => {
    expect(formatUnknownError(null)).toBe('null');
    expect(formatUnknownError(undefined)).toBe('undefined');
  });

  it('returns a safe fallback when JSON serialization fails', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(formatUnknownError(circular)).toBe('[Unserializable error]');
  });
});
