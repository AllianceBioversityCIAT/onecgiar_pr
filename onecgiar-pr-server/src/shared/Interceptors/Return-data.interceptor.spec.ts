import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './Return-data.interceptor';

describe('ResponseInterceptor', () => {
  const makeContext = (
    reqOverrides: Partial<any> = {},
    resOverrides: any = {},
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/path',
          method: 'GET',
          socket: { remoteAddress: '127.0.0.1' },
          ...reqOverrides,
        }),
        getResponse: () => ({
          status: jest.fn().mockReturnThis(),
          ...resOverrides,
        }),
      }),
    }) as any;

  it('should wrap response and warn when statusCode > 300', async () => {
    const interceptor = new ResponseInterceptor();
    const warnSpy = jest
      .spyOn((interceptor as any)._logger, 'warn')
      .mockImplementation(() => undefined as any);

    const res = { status: jest.fn().mockReturnThis() };
    const ctx = makeContext({}, res);
    const next = {
      handle: () =>
        of({ response: { ok: false }, status: 400, message: 'bad' }),
    } as any;

    const out = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(out).toEqual(
      expect.objectContaining({
        response: { ok: false },
        statusCode: 400,
        message: 'bad',
        path: '/path',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('should use default statusCode (200) and log verbose when statusCode <= 300', async () => {
    const interceptor = new ResponseInterceptor();
    const verboseSpy = jest
      .spyOn((interceptor as any)._logger, 'verbose')
      .mockImplementation(() => undefined as any);

    const res = { status: jest.fn().mockReturnThis() };
    const ctx = makeContext({ url: '/ok', method: 'POST' }, res);
    const next = {
      handle: () => of({ response: { ok: true }, message: 'ok' }),
    } as any;

    const out = await lastValueFrom(interceptor.intercept(ctx, next));

    expect(out).toEqual(
      expect.objectContaining({
        response: { ok: true },
        statusCode: 200,
        message: 'ok',
        path: '/ok',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(verboseSpy).toHaveBeenCalledTimes(1);
  });
});
