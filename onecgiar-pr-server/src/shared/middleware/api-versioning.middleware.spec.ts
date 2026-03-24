import { apiVersionMiddleware } from './api-versioning.middleware';

describe('apiVersionMiddleware', () => {
  it('should set apiVersion with v prefix when version does not include it', () => {
    const req: any = { query: { version: '1' } };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('v1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should keep apiVersion when version already includes v prefix', () => {
    const req: any = { query: { version: 'v2' } };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('v2');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should set apiVersion to empty when version is not provided', () => {
    const req: any = { query: {} };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
