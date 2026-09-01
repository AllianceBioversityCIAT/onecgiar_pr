import { HttpStatus } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

/**
 * P2-3534 — mistyping the number in a handle answered 500 with
 * "Cannot read properties of null (reading 'length')", and that raw JavaScript message was shown to
 * the user where the explanation belongs.
 *
 * The service takes 26 injected dependencies and only four of them are on this path, so it is built
 * by hand rather than through a TestBed: the alternative is 26 mocks to exercise two functions.
 */
describe('ResultsKnowledgeProductsService — handle lookup (P2-3534)', () => {
  const user: TokenDto = {
    id: 42,
    email: 'center@cgiar.org',
    first_name: 'Center',
    last_name: 'User',
  };

  const HANDLERS_ERROR = 1;
  const MQAP_SERVICE = 4;
  const ROLE_BY_USER = 12;
  const VERSIONING = 17;

  /** Builds the service with only the four collaborators this path touches. */
  const build = (mqapResponse: unknown) => {
    const deps: any[] = new Array(26).fill(null);

    // Mirrors the real handler: the thrown status and message are passed through untouched
    // (`shared/handlers/error.utils.ts` — `returnErrorRes`).
    deps[HANDLERS_ERROR] = {
      returnErrorRes: ({ error }: any) => ({
        response: error?.response ?? { error: true },
        message: error?.message ?? 'INTERNAL_SERVER_ERROR',
        status: error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    };
    deps[MQAP_SERVICE] = {
      getDataFromCGSpaceHandle: jest.fn().mockResolvedValue(mqapResponse),
    };
    deps[ROLE_BY_USER] = { isUserAdmin: jest.fn().mockResolvedValue(false) };
    deps[VERSIONING] = {
      $_findActivePhase: jest.fn().mockResolvedValue({ phase_year: 2026 }),
    };

    return new (ResultsKnowledgeProductsService as any)(
      ...deps,
    ) as ResultsKnowledgeProductsService;
  };

  describe('extractHandleIdentifier', () => {
    it('does not throw when CGSpace returned no handle at all', () => {
      const service = build(null);

      // This is the exact call that used to throw: `rawUrl.length` on a null.
      expect(() => service.extractHandleIdentifier(null)).not.toThrow();
      expect(service.extractHandleIdentifier(null)).toBe('');
      expect(service.extractHandleIdentifier(undefined)).toBe('');
    });

    it('still extracts the identifier from a real URL, with and without a query string', () => {
      const service = build(null);

      expect(
        service.extractHandleIdentifier(
          'https://cgspace.cgiar.org/handle/10568/12345',
        ),
      ).toBe('10568/12345');
      expect(
        service.extractHandleIdentifier(
          'https://cgspace.cgiar.org/handle/10568/12345?show=full',
        ),
      ).toBe('10568/12345');
    });
  });

  describe('findOnCGSpace with a handle that does not exist in CGSpace', () => {
    // MQAP answers with an object even when it found nothing — only `Handle` comes back null.
    const NOT_FOUND_IN_CGSPACE = { Handle: null, Title: null };

    it('answers 400 telling the person no document was found, not a runtime error', async () => {
      const service = build(NOT_FOUND_IN_CGSPACE);

      const result: any = await service.findOnCGSpace(
        '10568/999999999',
        user,
        2026,
      );

      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.message).toContain(
        'No knowledge product was found in CGSpace',
      );
      expect(result.message).toContain('10568/999999999');
    });

    it('never surfaces the JavaScript error the user used to see', async () => {
      const service = build(NOT_FOUND_IN_CGSPACE);

      const result: any = await service.findOnCGSpace('10568/abc', user, 2026);

      expect(result.message).not.toContain('Cannot read properties');
      expect(result.status).not.toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('keeps answering 400 for a missing handle, as it already did', async () => {
      const service = build(NOT_FOUND_IN_CGSPACE);

      const result: any = await service.findOnCGSpace('', user, 2026);

      expect(result.status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.message).toBe('Missing data: handle');
    });

    it('does not reject a handle CGSpace did find', async () => {
      const service = build({
        Handle: 'https://cgspace.cgiar.org/handle/10568/12345',
        Title: 'A real paper',
      });
      // Stop the flow right after the guard: everything past it needs repositories this test does not build.
      jest
        .spyOn(service, 'validateKPExistanceByHandle')
        .mockRejectedValue(new Error('reached the lookup'));

      const result: any = await service.findOnCGSpace(
        '10568/12345',
        user,
        2026,
      );

      expect(result.message).not.toContain(
        'No knowledge product was found in CGSpace',
      );
      expect(result.message).toBe('reached the lookup');
    });
  });
});

/**
 * Form-defect sweep of 31-Aug-2026, LOTE 5 #4: answering "No" to "Is this knowledge product a MELIA
 * Product?" hid the ToC MELIA study picker but never removed the study that was already chosen.
 *
 * The cause is a `undefined` where a `null` was meant: TypeORM's `update()` omits undefined
 * properties from the SQL, so the column was never written. Same service, same hand-built
 * construction as the block above — only six of the 26 collaborators are on this path.
 */
describe('ResultsKnowledgeProductsService — upsert clears the ToC MELIA study', () => {
  const user: TokenDto = {
    id: 42,
    email: 'center@cgiar.org',
    first_name: 'Center',
    last_name: 'User',
  };

  const KP_REPO = 0;
  const HANDLERS_ERROR = 1;
  const RESULT_REPO = 2;
  const AUTHOR_REPO = 7;
  const KEYWORD_REPO = 9;
  const FAIR_SCORE_REPO = 19;

  const build = () => {
    const deps: any[] = new Array(26).fill(null);
    const update = jest.fn().mockResolvedValue({ affected: 1 });

    deps[KP_REPO] = {
      findOne: jest
        .fn()
        .mockResolvedValue({ result_knowledge_product_id: 7, results_id: 1 }),
      update,
    };
    deps[HANDLERS_ERROR] = {
      returnErrorRes: ({ error }: any) => ({
        response: error?.response ?? { error: true },
        message: error?.message ?? 'INTERNAL_SERVER_ERROR',
        status: error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    };
    deps[RESULT_REPO] = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
    deps[AUTHOR_REPO] = { find: jest.fn().mockResolvedValue([]) };
    deps[KEYWORD_REPO] = { find: jest.fn().mockResolvedValue([]) };
    deps[FAIR_SCORE_REPO] = { find: jest.fn().mockResolvedValue([]) };

    const service = new (ResultsKnowledgeProductsService as any)(
      ...deps,
    ) as ResultsKnowledgeProductsService;

    return { service, update };
  };

  /** The columns handed to `update()` on the single call the happy path makes. */
  const written = (update: jest.Mock) => update.mock.calls[0][1];

  it('writes null for the study when the product is no longer a MELIA product', async () => {
    const { service, update } = build();

    const res: any = await service.upsert(1, user, {
      isMeliaProduct: false,
      ostSubmitted: true,
      ostMeliaId: 55,
      clarisaMeliaTypeId: 3,
      tocMeliaStudyId: 'a-study-uuid',
    } as any);

    expect(res.status).toBe(HttpStatus.OK);
    // `undefined` here is the bug: TypeORM drops the column and the study survives for ever.
    expect(written(update).toc_melia_study_id).toBeNull();
    // The three siblings were already cleared correctly; pinned so nobody loses them.
    expect(written(update).melia_previous_submitted).toBeNull();
    expect(written(update).ost_melia_study_id).toBeNull();
    expect(written(update).melia_type_id).toBeNull();
  });

  it('writes null when the reporter clears the picker but keeps it a MELIA product', async () => {
    const { service, update } = build();

    await service.upsert(1, user, {
      isMeliaProduct: true,
      ostSubmitted: false,
      ostMeliaId: null,
      clarisaMeliaTypeId: 3,
      tocMeliaStudyId: null,
    } as any);

    expect(written(update).toc_melia_study_id).toBeNull();
  });

  it('leaves the stored study untouched when the caller does not mention the field', async () => {
    const { service, update } = build();

    // The P22 form has no ToC MELIA study picker at all, so it never sends the key. Turning this
    // into a null would wipe P22 data — that is why the fix is pass-through, not a blanket null.
    await service.upsert(1, user, {
      isMeliaProduct: true,
      ostSubmitted: false,
      ostMeliaId: null,
      clarisaMeliaTypeId: 3,
    } as any);

    expect(written(update)).not.toHaveProperty(
      'toc_melia_study_id',
      expect.anything(),
    );
    expect(written(update).toc_melia_study_id).toBeUndefined();
  });

  it('writes null when the TOC-study question is answered No, even though it is still a MELIA product', async () => {
    const { service, update } = build();

    // Third way into the same defect, found while writing the reproduction steps: BOTH study
    // pickers are gated on this answer, and only `ostMeliaId` was being cleared.
    await service.upsert(1, user, {
      isMeliaProduct: true,
      ostSubmitted: false,
      ostMeliaId: 55,
      clarisaMeliaTypeId: 3,
      tocMeliaStudyId: 'a-study-uuid',
    } as any);

    expect(written(update).toc_melia_study_id).toBeNull();
    expect(written(update).ost_melia_study_id).toBeNull();
  });

  it('stores the chosen study when one is sent in the state that shows the picker', async () => {
    const { service, update } = build();

    // `ostSubmitted: true` matters: that is the only state where the picker is on screen
    // (`*ngIf="ostSubmitted === true && isP25()"`). With it false the study is cleared on purpose,
    // which the case above pins.
    await service.upsert(1, user, {
      isMeliaProduct: true,
      ostSubmitted: true,
      ostMeliaId: null,
      clarisaMeliaTypeId: 3,
      tocMeliaStudyId: 'a-study-uuid',
    } as any);

    expect(written(update).toc_melia_study_id).toBe('a-study-uuid');
  });
});
