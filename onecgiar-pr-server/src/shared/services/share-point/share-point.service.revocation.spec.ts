import { Logger } from '@nestjs/common';
import { SharePointService } from './share-point.service';

/**
 * The sharing-link revocation path, which used to fail in complete silence.
 *
 * Measured on prtest on 9 Sep 2026 (result 9075, evidence 13081, document
 * 012LTNW5AHN7JX64T5BJDLBXYKPJXDHYN2): switching an evidence public -> confidential ->
 * public returns the SAME two urls every single time. So `createLink` is handing back
 * permissions that already exist, an anonymous and an organization link live on the
 * document at once, and neither is being deleted — switching the evidence to
 * confidential only changes WHICH of the two we store, while the anonymous one keeps
 * serving the file to anybody who has it.
 *
 * Why the DELETE does not delete is NOT established here (it needs the container log or
 * a Graph call, and there are no credentials in this environment). What these tests pin
 * is that the outcome is no longer thrown away: a failed revocation is logged with its
 * status and travels back to the caller, so the next occurrence is diagnosable in one
 * attempt instead of by measuring links by hand.
 *
 * 🛑 They also pin that nothing throws: `addFileAccess` must keep resolving, because
 * `replicateSPFiles` (the phase-change copy, P2-3601) depends on it never turning a
 * committed rollover into an error.
 */
describe('SharePointService — sharing-link revocation (P2-3601 follow-up)', () => {
  const makeHttp = () => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  });

  const makeGpCache = () => ({
    getParam: jest.fn(async (key: string) => {
      const map: Record<string, string> = {
        sp_microsoft_graph_api_url: 'https://graph.example',
        sp_drive_id: 'drive-id',
        sp_token_url: 'https://login.example',
        sp_tenant_id: 'tenant-id',
      };
      return map[key] ?? '';
    }),
  });

  const makeEvidencesRepo = () => ({
    getLastSharepointId: jest.fn(async () => 10),
    getResultInformation: jest.fn(async () => [
      { phase_name: 'Reporting 2026', result_code: '9075' },
    ]),
  });

  /** An axios-shaped rejection that carries a bearer token, exactly like the real one. */
  const graphRejection = (status: number, code: string) => ({
    message: `Request failed with status code ${status}`,
    response: { status, data: { error: { code } } },
    config: {
      headers: { Authorization: 'Bearer SUPER-SECRET-GRAPH-TOKEN' },
    },
  });

  const build = (http: any) => {
    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).token = 'a-token';
    (service as any).expiresIn = 3600;
    (service as any).creationTime = new Date().getTime() / 1000;
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    return service;
  };

  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('reports ok per permission when the delete succeeds', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [{ id: 'p1', link: { webUrl: 'u1', scope: 'anonymous' } }],
        },
      }),
    });
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    expect(outcome.outcomes).toEqual([
      { permissionId: 'p1', ok: true, status: 204 },
    ]);
  });

  it('reports the failure instead of swallowing it when the delete is refused', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [
            { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
            {
              id: 'p-organization',
              link: { webUrl: 'u2', scope: 'organization' },
            },
          ],
        },
      }),
    });
    http.delete
      .mockReturnValueOnce({
        toPromise: jest
          .fn()
          .mockRejectedValue(graphRejection(403, 'accessDenied')),
      })
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({ status: 204 }),
      });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    expect(outcome.outcomes).toEqual([
      { permissionId: 'p-anonymous', ok: false, status: 403 },
      { permissionId: 'p-organization', ok: true, status: 204 },
    ]);
  });

  it('logs the refused deletion with its status, and never the bearer token', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [
            { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
          ],
        },
      }),
    });
    http.delete.mockReturnValue({
      toPromise: jest
        .fn()
        .mockRejectedValue(graphRejection(403, 'accessDenied')),
    });
    const service = build(http);

    await service.removeAllFilePermissions('doc-1');

    expect(loggerError).toHaveBeenCalled();
    const logged = loggerError.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('p-anonymous');
    expect(logged).toContain('403');
    expect(logged).toContain('accessDenied');
    // .cursorrules: the axios error carries config.headers.Authorization.
    expect(logged).not.toContain('SUPER-SECRET-GRAPH-TOKEN');
    expect(logged).not.toContain('Bearer');
  });

  it('hands the revocation outcome to the caller alongside the new link, and does not throw', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [
            { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
          ],
        },
      }),
    });
    http.delete.mockReturnValue({
      toPromise: jest
        .fn()
        .mockRejectedValue(graphRejection(403, 'accessDenied')),
    });
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: { link: { webUrl: 'https://sharepoint/new-link' } },
      }),
    });
    const service = build(http);

    const data: any = await service.addFileAccess('doc-1', false);

    // the success contract the two callers read is untouched...
    expect(data.link.webUrl).toBe('https://sharepoint/new-link');
    // ...and the part that used to be lost is now visible
    expect(data.revocation.outcomes).toEqual([
      { permissionId: 'p-anonymous', ok: false, status: 403 },
    ]);
  });

  it('still reports a clean revocation as such, so the log stays quiet on the happy path', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [{ id: 'p1', link: { webUrl: 'u1', scope: 'anonymous' } }],
        },
      }),
    });
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: { link: { webUrl: 'https://sharepoint/new-link' } },
      }),
    });
    const service = build(http);

    const data: any = await service.addFileAccess('doc-1', true);

    expect(data.revocation.outcomes).toEqual([
      { permissionId: 'p1', ok: true, status: 204 },
    ]);
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('VERIFIES the revocation by reading the permissions back: clean when nothing survives', async () => {
    const http = makeHttp();
    // first read: the link we must remove. second read (the verification): empty.
    http.get
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({
          data: {
            value: [{ id: 'p1', link: { webUrl: 'u1', scope: 'anonymous' } }],
          },
        }),
      })
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({ data: { value: [] } }),
      });
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    expect(outcome.attempted).toBe(1);
    expect(outcome.survivors).toEqual([]);
    expect(outcome.verifiedPrivate).toBe(true);
  });

  it('🛑 catches the measured defect: the delete resolves fine and the permission is STILL there', async () => {
    const http = makeHttp();
    // Both reads return the same permission — exactly what prtest does today.
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [
            { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
          ],
        },
      }),
    });
    // ...and the DELETE reports success, which is why nobody noticed.
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    // Every delete "succeeded"...
    expect(outcome.outcomes.every((o: any) => o.ok)).toBe(true);
    // ...and the file is still shared. Only the read-back can tell.
    expect(outcome.survivors).toEqual(['p-anonymous']);
    expect(outcome.verifiedPrivate).toBe(false);
  });

  it('reports attempted: 0 when we never even saw a permission to remove', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { value: [] } }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    // This is the OTHER live hypothesis, and it is now distinguishable from a refused
    // delete without reading any container log: nothing was attempted at all.
    expect(outcome.attempted).toBe(0);
    expect(outcome.outcomes).toEqual([]);
    expect(outcome.verifiedPrivate).toBe(true);
    expect(http.delete).not.toHaveBeenCalled();
  });

  it('🛑 FAILS CLOSED: if the permissions cannot be read back, it does not claim the file is private', async () => {
    const http = makeHttp();
    http.get
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({
          data: {
            value: [
              { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
            ],
          },
        }),
      })
      // the verification read fails — "I could not look" must never read as "it is private"
      .mockReturnValueOnce({
        toPromise: jest
          .fn()
          .mockRejectedValue(graphRejection(500, 'internalServerError')),
      });
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    expect(outcome.readBackFailed).toBe(true);
    expect(outcome.verifiedPrivate).toBe(false);
  });

  it('does NOT count a surviving organization link as public — it is already private', async () => {
    const http = makeHttp();
    http.get
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({
          data: {
            value: [
              { id: 'p-anonymous', link: { webUrl: 'u1', scope: 'anonymous' } },
            ],
          },
        }),
      })
      // after the delete only the organization link is left: the file IS private
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({
          data: {
            value: [
              {
                id: 'p-organization',
                link: { webUrl: 'u2', scope: 'organization' },
              },
            ],
          },
        }),
      });
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ status: 204 }),
    });
    const service = build(http);

    const outcome: any = await service.removeAllFilePermissions('doc-1');

    expect(outcome.survivors).toEqual(['p-organization']);
    expect(outcome.publicSurvivors).toEqual([]);
    expect(outcome.verifiedPrivate).toBe(true);
  });

  it('treats the token as expired inside the safety margin, so it cannot lapse mid-operation', () => {
    const service = build(makeHttp());
    (service as any).expiresIn = 3600;
    // 30 seconds of real life left: inside the 60 s margin.
    (service as any).creationTime = new Date().getTime() / 1000 - 3570;

    expect((service as any).isTokenExpired()).toBe(true);
  });

  it('does not consider a fresh token expired', () => {
    const service = build(makeHttp());
    (service as any).expiresIn = 3600;
    (service as any).creationTime = new Date().getTime() / 1000;

    expect((service as any).isTokenExpired()).toBe(false);
  });
});
