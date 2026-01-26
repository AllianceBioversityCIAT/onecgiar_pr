import { apiVersionMiddleware } from './api-versioning.middleware';

describe('apiVersionMiddleware', () => {
  it('debe setear apiVersion con prefijo v cuando version no lo trae', () => {
    const req: any = { query: { version: '1' } };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('v1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('debe respetar apiVersion cuando version ya trae prefijo v', () => {
    const req: any = { query: { version: 'v2' } };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('v2');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('debe setear apiVersion vacío cuando no hay version', () => {
    const req: any = { query: {} };
    const res: any = {};
    const next = jest.fn();

    apiVersionMiddleware(req, res, next);

    expect(req.apiVersion).toBe('');
    expect(next).toHaveBeenCalledTimes(1);
  });
});

