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
