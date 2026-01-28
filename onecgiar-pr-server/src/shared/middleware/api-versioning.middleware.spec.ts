import { Request, Response, NextFunction } from 'express';
import { apiVersionMiddleware } from './api-versioning.middleware';

describe('apiVersionMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = { query: {} };
    mockResponse = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set req.apiVersion to empty string when version query param is absent', () => {
    mockRequest.query = {};

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should set req.apiVersion to empty string when version query param is undefined', () => {
    mockRequest.query = { version: undefined };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should set req.apiVersion to version as-is when it already starts with "v"', () => {
    mockRequest.query = { version: 'v2' };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('v2');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should set req.apiVersion with "v" prefix when version does not start with "v"', () => {
    mockRequest.query = { version: '1' };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('v1');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle version as number by normalizing via toString()', () => {
    mockRequest.query = { version: 2 as unknown as string };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('v2');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should preserve version starting with "v" when value is longer', () => {
    mockRequest.query = { version: 'v10' };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockRequest['apiVersion']).toBe('v10');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should always call next()', () => {
    mockRequest.query = { version: 'v1' };

    apiVersionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(mockNext).toHaveBeenCalledWith();
  });
});
