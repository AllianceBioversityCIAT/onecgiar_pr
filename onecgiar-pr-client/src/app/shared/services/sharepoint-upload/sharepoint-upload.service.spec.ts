import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SharePointUploadService } from './sharepoint-upload.service';
import { ResultsApiService } from '../api/results-api.service';

/**
 * P2-3220 — the shared upload flow. This spec owns the behaviour that used to live duplicated in
 * `rd-evidences`, `innovation-dev-info` and `bilateral/section-evidence`: the session call, the
 * progress polling and the four `sp_*` fields copied off the response.
 *
 * The percentage cases came over from `rd-evidences.component.spec.ts` unchanged in intent — the
 * behaviour moved, so the tests moved with it rather than being deleted.
 */
describe('SharePointUploadService', () => {
  let service: SharePointUploadService;
  let api: {
    POST_createUploadSession: jest.Mock;
    POST_createUploadSessionP25: jest.Mock;
    PUT_loadFileInUploadSession: jest.Mock;
    GET_loadFileInUploadSession: jest.Mock;
  };

  const UPLOAD_URL = 'https://sharepoint/upload/session';
  const SP_RESPONSE = {
    webUrl: 'https://sharepoint/f/report.pdf',
    id: 'doc-1',
    name: 'report.pdf',
    parentReference: { path: '/drive/root:/PRMS/2026' }
  };

  const file = (name: string) => new File([], name);

  beforeEach(() => {
    api = {
      POST_createUploadSession: jest.fn().mockResolvedValue({ response: UPLOAD_URL }),
      POST_createUploadSessionP25: jest.fn().mockReturnValue(of({ response: UPLOAD_URL })),
      PUT_loadFileInUploadSession: jest.fn().mockResolvedValue(SP_RESPONSE),
      GET_loadFileInUploadSession: jest.fn().mockResolvedValue({ nextExpectedRanges: ['512-1024'] })
    };

    TestBed.configureTestingModule({
      providers: [SharePointUploadService, { provide: ResultsApiService, useValue: api }]
    });
    service = TestBed.inject(SharePointUploadService);
  });

  afterEach(() => jest.useRealTimers());

  describe('the two doors — the reason the service exists', () => {
    it('uses the evidences session by default', async () => {
      await service.uploadPending([{ file: file('a.pdf') }], { resultId: 1 });

      expect(api.POST_createUploadSession).toHaveBeenCalledWith({ resultId: 1, fileName: 'a.pdf', count: 1 });
      expect(api.POST_createUploadSessionP25).not.toHaveBeenCalled();
    });

    /**
     * `innovation-dev-info` needs the P25 endpoint, and it returns an OBSERVABLE while the other
     * returns a promise. Both are normalised inside, so the caller says what it is uploading and
     * never which endpoint to call — that is what stops a new form from picking the wrong one.
     */
    it('uses the innovation-development session when asked, and unwraps its observable', async () => {
      const item: any = { file: file('b.pdf') };

      await service.uploadPending([item], { resultId: 2, flow: 'innovation-development' });

      expect(api.POST_createUploadSessionP25).toHaveBeenCalledWith({ resultId: 2, fileName: 'b.pdf', count: 1 });
      expect(api.POST_createUploadSession).not.toHaveBeenCalled();
      expect(api.PUT_loadFileInUploadSession).toHaveBeenCalledWith(item.file, UPLOAD_URL);
    });

    /**
     * The server wraps every payload in `{ response, message, status }`. Assigning the envelope
     * instead of `response` sent the PUT to a stringified object and always failed — one of the two
     * bugs P2-3220 started from. Pinned here so it cannot come back through any surface at once.
     */
    it('sends the PUT to response.response, not to the whole envelope', async () => {
      await service.uploadPending([{ file: file('c.pdf') }], { resultId: 3 });

      expect(api.PUT_loadFileInUploadSession).toHaveBeenCalledWith(expect.any(File), UPLOAD_URL);
    });
  });

  describe('what it writes back', () => {
    it('copies the four SharePoint fields off the response', async () => {
      const item: any = { file: file('report.pdf') };

      await service.uploadPending([item], { resultId: 1 });

      expect(item.link).toBe(SP_RESPONSE.webUrl);
      expect(item.sp_document_id).toBe('doc-1');
      expect(item.sp_file_name).toBe('report.pdf');
      expect(item.sp_folder_path).toBe('/PRMS/2026');
    });

    it('counts only the items that carry a file, one-based', async () => {
      await service.uploadPending([{ file: file('1.pdf') }, {}, { file: file('2.pdf') }] as any, { resultId: 1 });

      expect(api.POST_createUploadSession.mock.calls.map(c => c[0].count)).toEqual([1, 2]);
    });
  });

  describe('skipAlreadyUploaded', () => {
    it('skips items that already have a link by default', async () => {
      await service.uploadPending([{ file: file('a.pdf'), link: 'http://sp/already' }] as any, { resultId: 1 });

      expect(api.POST_createUploadSession).not.toHaveBeenCalled();
    });

    it('re-uploads them when the surface asks for it', async () => {
      await service.uploadPending([{ file: file('a.pdf'), link: 'http://sp/already' }] as any, {
        resultId: 1,
        skipAlreadyUploaded: false
      });

      expect(api.POST_createUploadSession).toHaveBeenCalled();
    });
  });

  describe('never fails silently', () => {
    it('returns the names of the files that failed and keeps going', async () => {
      api.POST_createUploadSession.mockRejectedValue(new Error('session refused'));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const failed = await service.uploadPending([{ file: file('one.pdf') }, { file: file('two.pdf') }] as any, {
        resultId: 1
      });

      expect(failed).toEqual(['one.pdf', 'two.pdf']);
    });

    it('returns an empty list when every upload succeeds', async () => {
      await expect(service.uploadPending([{ file: file('ok.pdf') }] as any, { resultId: 1 })).resolves.toEqual([]);
    });

    it('does nothing without items or without a result id', async () => {
      await expect(service.uploadPending(null, { resultId: 1 })).resolves.toEqual([]);
      await expect(service.uploadPending([{ file: file('a.pdf') }] as any, { resultId: '' })).resolves.toEqual([]);
      expect(api.POST_createUploadSession).not.toHaveBeenCalled();
    });
  });

  describe('progress tracking (moved from rd-evidences)', () => {
    it('does not poll when the surface renders no progress bar', async () => {
      await service.uploadPending([{ file: file('a.pdf') }] as any, { resultId: 1 });

      expect(api.GET_loadFileInUploadSession).not.toHaveBeenCalled();
    });

    it('pins the percentage at 100 once the file is up', async () => {
      const item: any = { file: file('a.pdf'), percentage: 40 };

      await service.uploadPending([item], { resultId: 1, trackProgress: true });

      expect(item.percentage).toBe(100);
    });

    it.each([
      ['0-1024', 0, '0'],
      ['512-1024', 0, '50'],
      ['0-0', 50, 50],
      ['0-', 0, 0],
      [null, 50, 50]
    ])('range %s with percentage %s becomes %s', async (range, initial, expected) => {
      const item: any = { file: file('a.pdf'), percentage: initial };
      // Hold the PUT open so the poll runs while the upload is still in flight.
      let releasePut: (v: unknown) => void;
      api.PUT_loadFileInUploadSession.mockReturnValue(new Promise(res => (releasePut = res)));
      api.GET_loadFileInUploadSession.mockResolvedValue({ nextExpectedRanges: [range] });
      jest.useFakeTimers();

      const pending = service.uploadPending([item], { resultId: 1, trackProgress: true });
      await jest.advanceTimersByTimeAsync(2000);

      expect(item.percentage).toBe(expected);

      releasePut!(SP_RESPONSE);
      await pending;
    });

    it('stops polling when the session read fails', async () => {
      const item: any = { file: file('a.pdf'), percentage: 10 };
      let releasePut: (v: unknown) => void;
      api.PUT_loadFileInUploadSession.mockReturnValue(new Promise(res => (releasePut = res)));
      api.GET_loadFileInUploadSession.mockRejectedValue(new Error('session gone'));
      jest.useFakeTimers();

      const pending = service.uploadPending([item], { resultId: 1, trackProgress: true });
      await jest.advanceTimersByTimeAsync(2000);

      expect(item.percentage).toBe(100);

      releasePut!(SP_RESPONSE);
      await pending;
    });
  });
});
