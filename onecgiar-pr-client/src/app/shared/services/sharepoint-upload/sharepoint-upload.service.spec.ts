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
    PUT_loadFileFragmentInUploadSession: jest.Mock;
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
      PUT_loadFileFragmentInUploadSession: jest.fn().mockResolvedValue(SP_RESPONSE),
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

    /**
     * P2-3220 — the last surface to migrate (`innovation-dev-info`) did
     * `sp_file_name = response?.name || evidence.file.name`, and the two migrated before it never
     * did. Its `user-evidence` template gates the whole uploaded-file row on `sp_file_name`
     * (`*ngIf="evidence?.sp_file_name; else uploadfilefield"`), so a nameless response would make
     * the just-attached file disappear and fall back to the drag-and-drop box — which is why the
     * fallback is an OPTION and not a new default: `rd-evidences` and `bilateral/section-evidence`
     * must keep behaving exactly as they did.
     */
    describe('fallbackToLocalName', () => {
      const nameless = { ...SP_RESPONSE, name: undefined };

      it('is OFF by default — a nameless response leaves sp_file_name empty, as the first two surfaces always did', async () => {
        api.PUT_loadFileInUploadSession.mockResolvedValue(nameless);
        const item: any = { file: file('local-name.pdf') };

        await service.uploadPending([item], { resultId: 1 });

        expect(item.sp_file_name).toBeUndefined();
      });

      it('writes the LOCAL file name when the server answers without one', async () => {
        api.PUT_loadFileInUploadSession.mockResolvedValue(nameless);
        const item: any = { file: file('local-name.pdf') };

        await service.uploadPending([item], { resultId: 1, flow: 'innovation-development', fallbackToLocalName: true });

        expect(item.sp_file_name).toBe('local-name.pdf');
      });

      /** `||`, not `??`: the old copy fell back on an empty string too. */
      it('falls back on an EMPTY server name as well, which is what the old copy did', async () => {
        api.PUT_loadFileInUploadSession.mockResolvedValue({ ...SP_RESPONSE, name: '' });
        const item: any = { file: file('local-name.pdf') };

        await service.uploadPending([item], { resultId: 1, fallbackToLocalName: true });

        expect(item.sp_file_name).toBe('local-name.pdf');
      });

      it('still prefers the server name when there is one', async () => {
        const item: any = { file: file('local-name.pdf') };

        await service.uploadPending([item], { resultId: 1, fallbackToLocalName: true });

        expect(item.sp_file_name).toBe('report.pdf');
      });
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

  /**
   * P2-3318 — "Evidence upload fails for PPT". Microsoft Graph refuses any single upload request of
   * 60 MiB or more, and `PUT_loadFileInUploadSession` sends the whole file as one request, so every
   * file at or above that size failed while the forms promised (and validated) up to 1 GB.
   *
   * These cases are written around the two things that can regress: a file that works today must
   * still take the exact same single request, and a file that never could must go up in fragments
   * Graph will actually accept — in order, 320-KiB-aligned, and with the driveItem read off the LAST
   * one, because Graph answers all the others with 202 and no body worth copying.
   */
  describe('files too big for one request (P2-3318)', () => {
    const MiB = 1024 * 1024;
    const CAP = 60 * MiB;
    const FRAGMENT = 10 * MiB;

    /** A File of an arbitrary size whose `slice` reports the range asked for instead of bytes. */
    const sized = (name: string, size: number) => {
      const f = new File([], name);
      Object.defineProperty(f, 'size', { value: size });
      jest.spyOn(f, 'slice').mockImplementation(((start = 0, end = size) => ({ start, end })) as any);
      return f;
    };

    const rangesOf = () => api.PUT_loadFileFragmentInUploadSession.mock.calls.map(c => [c[2], c[3], c[4]]);

    it('leaves a file that fits in one request on the single PUT, untouched', async () => {
      const item: any = { file: sized('deck.pptx', CAP - 1) };

      await service.uploadPending([item], { resultId: 1 });

      expect(api.PUT_loadFileInUploadSession).toHaveBeenCalledWith(item.file, UPLOAD_URL);
      expect(api.PUT_loadFileFragmentInUploadSession).not.toHaveBeenCalled();
    });

    /**
     * 60 MiB exactly is already too big: the limit is "less than 60 MiB", so the boundary itself has
     * to fragment or the fix stops one byte short of the files it exists for.
     */
    it('fragments a file of exactly the cap — the limit is "less than 60 MiB"', async () => {
      await service.uploadPending([{ file: sized('deck.pptx', CAP) }], { resultId: 1 });

      expect(api.PUT_loadFileInUploadSession).not.toHaveBeenCalled();
      expect(api.PUT_loadFileFragmentInUploadSession).toHaveBeenCalledTimes(6);
    });

    it('sends a 62 MiB deck as sequential, gapless, 320-KiB-aligned fragments of the whole file', async () => {
      const size = 62 * MiB;

      await service.uploadPending([{ file: sized('deck.pptx', size) }], { resultId: 1 });

      const ranges = rangesOf();
      expect(ranges).toHaveLength(7);
      // Covers the file end to end with no gap and no overlap, and every range declares the true total.
      expect(ranges[0]).toEqual([0, FRAGMENT - 1, size]);
      ranges.forEach(([start, end, total], i) => {
        expect(total).toBe(size);
        if (i > 0) expect(start).toBe(ranges[i - 1][1] + 1);
        expect(end - start + 1).toBe(i === ranges.length - 1 ? size - (ranges.length - 1) * FRAGMENT : FRAGMENT);
        // Graph rejects any fragment but the last that is not a multiple of 320 KiB.
        if (i < ranges.length - 1) expect((end - start + 1) % (320 * 1024)).toBe(0);
      });
      expect(ranges[6][1]).toBe(size - 1);
    });

    it('slices exactly the bytes it declares in each Content-Range', async () => {
      const size = 62 * MiB;
      const item: any = { file: sized('deck.pptx', size) };

      await service.uploadPending([item], { resultId: 1 });

      const sliced = (item.file.slice as jest.Mock).mock.calls.map(([start, end]) => [start, end]);
      // Both sides come from the same run, so the comparison is vacuous unless something was sliced.
      expect(sliced).toHaveLength(7);
      expect(sliced).toEqual(rangesOf().map(([start, end]) => [start, end + 1]));
    });

    /**
     * Graph answers every fragment but the last with 202 and no driveItem. Copying the first
     * response would leave the evidence with an empty link and no `sp_document_id` — saved, and
     * pointing at nothing.
     */
    it('writes back the LAST fragment response, not the first', async () => {
      const size = 62 * MiB;
      const item: any = { file: sized('deck.pptx', size) };
      api.PUT_loadFileFragmentInUploadSession.mockImplementation((_f: any, _l: any, _s: number, end: number, total: number) =>
        Promise.resolve(end + 1 === total ? SP_RESPONSE : { nextExpectedRanges: [`${end + 1}-${total - 1}`] })
      );

      await service.uploadPending([item], { resultId: 1 });

      expect(item.link).toBe(SP_RESPONSE.webUrl);
      expect(item.sp_document_id).toBe('doc-1');
      expect(item.sp_file_name).toBe('report.pdf');
      expect(item.sp_folder_path).toBe('/PRMS/2026');
    });

    it('reports the file by name when a fragment fails, and saves the rest', async () => {
      api.PUT_loadFileFragmentInUploadSession.mockRejectedValue(new Error('413'));
      const big: any = { file: sized('deck.pptx', 62 * MiB) };
      const small: any = { file: file('note.pdf') };

      const failed = await service.uploadPending([big, small], { resultId: 1 });

      expect(failed).toEqual(['deck.pptx']);
      expect(small.link).toBe(SP_RESPONSE.webUrl);
    });
  });
});
