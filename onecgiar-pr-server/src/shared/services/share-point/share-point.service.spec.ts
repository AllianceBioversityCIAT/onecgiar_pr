import { SharePointService } from './share-point.service';

describe('SharePointService', () => {
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
        sp_site_id: 'site-id',
        sp_token_url: 'https://login.example',
        sp_tenant_id: 'tenant-id',
        sp_application_id: 'app-id',
        sp_client_value: 'client-secret',
        sp_scope: 'scope',
        sp_grant_type: 'client_credentials',
      };
      return map[key] ?? '';
    }),
  });

  const makeEvidencesRepo = () => ({
    getLastSharepointId: jest.fn(async () => 10),
    getResultInformation: jest.fn(async () => [
      { phase_name: 'Phase', result_code: 'R1', date_as_name: '20260123' },
    ]),
  });

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getToken should fetch a token when expiresIn is not set', async () => {
    const http = makeHttp();
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: { access_token: 'token', expires_in: 3600 },
      }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    const token = await service.getToken();
    expect(token).toBe('token');
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('getToken should return cached token when it has not expired', async () => {
    const http = makeHttp();
    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    (service as any).token = 'cached';
    (service as any).expiresIn = 9999;
    (service as any).creationTime = new Date().getTime() / 1000;

    await expect(service.getToken()).resolves.toBe('cached');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('getAllFilePermissions should return ids with link.webUrl', async () => {
    const http = makeHttp();
    http.get.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          value: [
            { id: 'p1', link: { webUrl: 'x' } },
            { id: 'p2', link: {} },
            { id: 'p3' },
          ],
        },
      }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    (service as any).token = 't';
    (service as any).expiresIn = 9999;
    (service as any).creationTime = new Date().getTime() / 1000;

    const ids = await service.getAllFilePermissions('file');
    expect(ids).toEqual(['p1']);
  });

  it('removeAllFilePermissions should call removeFilePermission for each permission', async () => {
    const service = new SharePointService(
      makeHttp() as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    jest
      .spyOn(service, 'getAllFilePermissions')
      .mockResolvedValue(['a', 'b'] as any);
    const removeSpy = jest
      .spyOn(service, 'removeFilePermission')
      .mockResolvedValue({} as any);

    await service.removeAllFilePermissions('file');
    expect(removeSpy).toHaveBeenCalledTimes(2);
  });

  it('replicateFile should copy and return the replicated file id', async () => {
    const service = new SharePointService(
      makeHttp() as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    jest.spyOn(service, 'createFileFolder').mockResolvedValue('folder' as any);
    jest.spyOn(service, 'getFileInfo').mockResolvedValue({ name: 'a.txt' } as any);
    jest.spyOn(service, 'copyFile').mockResolvedValue({} as any);
    jest
      .spyOn(service, 'getFolderFilesList')
      .mockResolvedValue([{ id: 'id123', name: 'a.txt' }] as any);

    await expect(service.replicateFile('file', '/path')).resolves.toBe('id123');
  });

  it('generateFilePath should build filePath using phase_name and result_code', async () => {
    const service = new SharePointService(
      makeHttp() as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    const { filePath, pathInformation } = await service.generateFilePath(1 as any);
    expect(filePath).toBe('/Phase/Result R1');
    expect(pathInformation).toEqual(
      expect.objectContaining({ phase_name: 'Phase', result_code: 'R1' }),
    );
  });

  it('createUploadSession should return a formatted uploadUrl', async () => {
    const http = makeHttp();
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { uploadUrl: 'upload-url' } }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    jest.spyOn(service, 'getToken').mockResolvedValue('token' as any);
    jest
      .spyOn(service, 'generateFilePath')
      .mockResolvedValue({
        filePath: '/Phase/Result R1',
        pathInformation: { result_code: 'R1', date_as_name: '20260123' },
      } as any);
    jest.spyOn(service, 'createFileFolder').mockResolvedValue('folder' as any);

    const res = await service.createUploadSession({
      fileName: 'file.pdf',
      resultId: '1',
      count: 2,
    } as any);

    expect(res).toEqual(
      expect.objectContaining({
        statusCode: 200,
        response: 'upload-url',
      }),
    );
  });

  it('createFileFolder should create folder and delete .folder-reference when applicable', async () => {
    const http = makeHttp();
    http.put.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          id: 'tmp-id',
          name: '.folder-reference',
          parentReference: { id: 'parent-id' },
        },
      }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    jest.spyOn(service, 'getToken').mockResolvedValue('token' as any);
    const delSpy = jest.spyOn(service, 'deleteFile').mockResolvedValue({} as any);

    const folderId = await service.createFileFolder('/x');
    expect(folderId).toBe('parent-id');
    expect(delSpy).toHaveBeenCalledWith('tmp-id');
  });

  it('deleteFile / getFileInfo / copyFile / getFolderFilesList should use httpService', async () => {
    const http = makeHttp();
    http.delete.mockReturnValue({ toPromise: jest.fn().mockResolvedValue({ ok: true }) });
    http.get
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({ data: { id: 'f1', name: 'a.txt' } }),
      })
      .mockReturnValueOnce({
        toPromise: jest.fn().mockResolvedValue({ data: { value: [{ id: 'c1' }] } }),
      });
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { started: true } }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    jest.spyOn(service, 'getToken').mockResolvedValue('token' as any);

    await expect(service.deleteFile('file')).resolves.toEqual({ ok: true });
    await expect(service.getFileInfo('file')).resolves.toEqual({ id: 'f1', name: 'a.txt' });
    await expect(service.copyFile('f', 'dest', 'a.txt')).resolves.toEqual({ started: true });
    await expect(service.getFolderFilesList('folder')).resolves.toEqual([{ id: 'c1' }]);
  });

  it('addFileAccess should create a link with the correct scope', async () => {
    const http = makeHttp();
    http.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { link: { webUrl: 'x' } } }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    jest.spyOn(service, 'getToken').mockResolvedValue('token' as any);
    jest.spyOn(service, 'removeAllFilePermissions').mockResolvedValue(undefined as any);

    const res = await service.addFileAccess('file-id', true);
    expect(res).toEqual({ link: { webUrl: 'x' } });

    const body = http.post.mock.calls[0][1];
    expect(body).toEqual(expect.objectContaining({ scope: 'anonymous', type: 'view' }));
  });

  it('removeFilePermission should call DELETE and return response', async () => {
    const http = makeHttp();
    http.delete.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ deleted: true }),
    });

    const service = new SharePointService(
      http as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );
    (service as any).microsoftGraphApiUrl = 'https://graph.example';
    jest.spyOn(service, 'getToken').mockResolvedValue('token' as any);

    await expect(service.removeFilePermission('file', 'perm')).resolves.toEqual({
      deleted: true,
    });
  });

  it('isTokenExpired should reflect expiration based on creationTime/expiresIn', () => {
    const service = new SharePointService(
      makeHttp() as any,
      makeGpCache() as any,
      makeEvidencesRepo() as any,
    );

    (service as any).creationTime = 0;
    (service as any).expiresIn = 1;
    expect((service as any).isTokenExpired()).toBe(true);

    (service as any).creationTime = new Date().getTime() / 1000;
    (service as any).expiresIn = 9999;
    expect((service as any).isTokenExpired()).toBe(false);
  });
});

