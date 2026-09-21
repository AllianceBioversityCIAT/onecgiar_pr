import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ResultsTocResultRepository } from '../../../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultsTocResultIndicatorsRepository } from '../../../../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ExistingResultContributorsLoaderService } from './existing-result-contributors-loader.service';

// @akili-spec bugfix/reported-results-center-scoping (RRC-R-3, RRC-AC-2, RRC-AC-6)
// Minimal fake TypeORM `find` matcher: interprets the shape of `where` the loader
// builds (plain object = AND, array = OR, nested objects = relation narrowing,
// FindOperator-shaped values = In()/IsNull()) against a seeded row, so these tests
// prove the query the loader constructs actually isolates combination-groups,
// not just that a mock was called with some arguments.
type FindOperatorLike = { _type: string; _value: unknown };

const isFindOperator = (value: unknown): value is FindOperatorLike =>
  !!value &&
  typeof value === 'object' &&
  '_type' in (value as Record<string, unknown>);

function matchesCondition(actual: unknown, expected: unknown): boolean {
  if (isFindOperator(expected)) {
    if (expected._type === 'isNull') {
      return actual === null || actual === undefined;
    }
    if (expected._type === 'in') {
      return Array.from(expected._value as Iterable<unknown>).includes(actual);
    }
    return actual === expected._value;
  }

  if (Array.isArray(actual)) {
    return actual.some((item) =>
      matchesWhere(item, expected as Record<string, unknown>),
    );
  }

  if (expected !== null && typeof expected === 'object') {
    return matchesWhere(actual, expected as Record<string, unknown>);
  }

  return actual === expected;
}

function matchesWhere(row: any, where: any): boolean {
  if (Array.isArray(where)) {
    return where.some((clause) => matchesWhere(row, clause));
  }
  return Object.entries(where ?? {}).every(([key, expected]) =>
    matchesCondition(row?.[key], expected),
  );
}

const buildContributionRow = (overrides: {
  resultTocResultId: number;
  resultId: number;
  tocResultId: number;
  tocResultIndicatorId: string;
  tocIndicatorTargetId: number | null;
  statusId?: number;
}) => ({
  result_toc_result_id: overrides.resultTocResultId,
  result_id: overrides.resultId,
  toc_result_id: overrides.tocResultId,
  is_active: true,
  obj_results: {
    is_active: true,
    status_id: overrides.statusId ?? 2, // QualityAssessed — within default 'reviewed' scope
    title: 'Result',
    result_code: 'RES',
    result_type_id: 1,
    version_id: 1,
    obj_status: { status_name: 'Quality Assessed' },
    obj_result_type: { id: 1, name: 'Type' },
  },
  obj_results_toc_result_indicators: [
    {
      toc_results_indicator_id: overrides.tocResultIndicatorId,
      is_active: true,
      is_not_aplicable: false,
      obj_result_indicator_targets: [
        {
          number_target: 1,
          target_date: 2026,
          contributing_indicator: 1,
          is_active: true,
          toc_indicator_target_id: overrides.tocIndicatorTargetId,
        },
      ],
    },
  ],
});

describe('ExistingResultContributorsLoaderService', () => {
  let service: ExistingResultContributorsLoaderService;

  const mockResultsTocResultRepository = {
    find: jest.fn(),
  };
  const mockResultsTocResultIndicatorsRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExistingResultContributorsLoaderService,
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        {
          provide: ResultsTocResultIndicatorsRepository,
          useValue: mockResultsTocResultIndicatorsRepository,
        },
      ],
    }).compile();

    service = module.get(ExistingResultContributorsLoaderService);
  });

  describe('parseResultTocResultId', () => {
    it('should parse valid numeric ids', () => {
      expect(service.parseResultTocResultId(5)).toBe(5);
      expect(service.parseResultTocResultId('12')).toBe(12);
    });

    it('should reject invalid ids', () => {
      expect(() => service.parseResultTocResultId('abc')).toThrow(
        'Invalid resultTocResultId provided.',
      );
      expect(() => service.parseResultTocResultId(0)).toThrow(
        'Invalid resultTocResultId provided.',
      );
    });
  });

  describe('validateTocResultIndicatorId', () => {
    it('should return trimmed indicator id', () => {
      expect(service.validateTocResultIndicatorId('IND-55')).toBe('IND-55');
    });

    it('should reject empty indicator ids', () => {
      expect(() => service.validateTocResultIndicatorId('')).toThrow(
        'Invalid tocResultIndicatorId provided.',
      );
      expect(() => service.validateTocResultIndicatorId('   ')).toThrow(
        'Invalid tocResultIndicatorId provided.',
      );
    });
  });

  describe('loadContributions', () => {
    it('should query contributions with expected filters', async () => {
      const records = [{ result_toc_result_id: 11, result_id: 101 }];
      mockResultsTocResultRepository.find.mockResolvedValueOnce(records);

      const result = await service.loadContributions(5, 'IND-55');

      expect(mockResultsTocResultRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            toc_result_id: 5,
            is_active: true,
            obj_results_toc_result_indicators: expect.objectContaining({
              toc_results_indicator_id: 'IND-55',
              is_active: true,
              is_not_aplicable: false,
            }),
          }),
        }),
      );
      expect(result).toEqual(records);
    });

    it('should throw not found when repository returns no rows', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([]);

      await expect(
        service.loadContributions(10, 'IND-1'),
      ).rejects.toMatchObject({
        message:
          'No result contribution record was found with the provided resultTocResultId.',
        status: HttpStatus.NOT_FOUND,
      });
    });

    // @akili-spec changes/indicator-reported-results (IRR-R-3.1, IRR-AC-3)
    it('should default to the reviewed scope status set when scope is omitted', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        { result_toc_result_id: 11, result_id: 101 },
      ]);

      await service.loadContributions(5, 'IND-55');

      const statusWhere =
        mockResultsTocResultRepository.find.mock.calls[0][0].where.obj_results
          .status_id;
      expect(statusWhere._type).toBe('in');
      expect([...statusWhere._value].sort((a, b) => a - b)).toEqual([2, 6]);
    });

    // @akili-spec changes/indicator-reported-results (IRR-R-3, IRR-AC-3)
    it('should use the reviewed scope status set ([QualityAssessed, Approved]) for scope="reviewed"', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        { result_toc_result_id: 11, result_id: 101 },
      ]);

      await service.loadContributions(5, 'IND-55', 'reviewed');

      const statusWhere =
        mockResultsTocResultRepository.find.mock.calls[0][0].where.obj_results
          .status_id;
      expect(statusWhere._type).toBe('in');
      expect([...statusWhere._value].sort((a, b) => a - b)).toEqual([2, 6]);
    });

    // @akili-spec changes/indicator-reported-results (IRR-R-3, IRR-R-3.1, IRR-AC-3)
    it('should use the explicit all-scope status set (Editing, QualityAssessed, Submitted, PendingReview, Approved) for scope="all", excluding Discontinued/Rejected/Draft', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        { result_toc_result_id: 11, result_id: 101 },
      ]);

      await service.loadContributions(5, 'IND-55', 'all');

      const statusWhere =
        mockResultsTocResultRepository.find.mock.calls[0][0].where.obj_results
          .status_id;
      expect(statusWhere._type).toBe('in');
      const statusIds = [...statusWhere._value].sort((a, b) => a - b);
      expect(statusIds).toEqual([1, 2, 3, 5, 6]);
      // Discontinued (4), Rejected (7), Draft (8) must be absent
      expect(statusIds).not.toContain(4);
      expect(statusIds).not.toContain(7);
      expect(statusIds).not.toContain(8);
    });

    // @akili-spec changes/indicator-reported-results
    it('should include obj_result_type in relations and select', async () => {
      mockResultsTocResultRepository.find.mockResolvedValueOnce([
        { result_toc_result_id: 11, result_id: 101 },
      ]);

      await service.loadContributions(5, 'IND-55', 'all');

      const callArgs = mockResultsTocResultRepository.find.mock.calls[0][0];
      expect(callArgs.relations.obj_results.obj_result_type).toBe(true);
      expect(callArgs.select.obj_results.obj_result_type).toEqual({
        id: true,
        name: true,
      });
    });
  });

  // @akili-spec bugfix/reported-results-center-scoping (RRC-R-3, RRC-DD-4, RRC-AC-2, RRC-AC-6)
  describe('loadContributions — combination-group isolation (tocIndicatorTargetId)', () => {
    const IITA_ALONE_TARGET_ID = 111;
    const CIMMYT_IITA_TARGET_ID = 222;

    it('excludes a sibling combination-group result when the caller supplies tocIndicatorTargetId (RRC-AC-2)', async () => {
      // Both groups share the same toc_result_id/toc_results_indicator_id
      // (the confirmed root cause) — only toc_indicator_target_id differs.
      const rowLinkedToIitaAloneOnly = buildContributionRow({
        resultTocResultId: 11,
        resultId: 101,
        tocResultId: 5,
        tocResultIndicatorId: 'IND-55',
        tocIndicatorTargetId: IITA_ALONE_TARGET_ID,
      });

      mockResultsTocResultRepository.find.mockImplementation((options: any) =>
        Promise.resolve(
          [rowLinkedToIitaAloneOnly].filter((row) =>
            matchesWhere(row, options.where),
          ),
        ),
      );

      // Panel opened for the sibling group (CIMMYT, IITA) — the result was
      // only ever linked to the IITA-alone group, so it must not surface here.
      await expect(
        service.loadContributions(
          5,
          'IND-55',
          'reviewed',
          CIMMYT_IITA_TARGET_ID,
        ),
      ).rejects.toMatchObject({
        message:
          'No result contribution record was found with the provided resultTocResultId.',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('preserves the existing coarse related_node_id-only fallback for a historical row with no anchor (RRC-AC-6)', async () => {
      const historicalRowWithoutAnchor = buildContributionRow({
        resultTocResultId: 12,
        resultId: 102,
        tocResultId: 5,
        tocResultIndicatorId: 'IND-55',
        tocIndicatorTargetId: null,
      });

      mockResultsTocResultRepository.find.mockImplementation((options: any) =>
        Promise.resolve(
          [historicalRowWithoutAnchor].filter((row) =>
            matchesWhere(row, options.where),
          ),
        ),
      );

      const result = await service.loadContributions(
        5,
        'IND-55',
        'reviewed',
        CIMMYT_IITA_TARGET_ID,
      );

      expect(result).toEqual([historicalRowWithoutAnchor]);
    });

    // @akili-spec bugfix/reported-results-center-scoping (RRC-R-8) — rework
    // attempt 2, reviewer-mandated: Express yields '' for a bare
    // `?tocIndicatorTargetId=`, and Number('') is 0. An empty string MUST
    // behave as "absent" (coarse-only), never as a live
    // `toc_indicator_target_id = 0` filter.
    it('treats an empty-string tocIndicatorTargetId as absent, not as toc_indicator_target_id = 0', async () => {
      const rowLinkedToIitaAlone = buildContributionRow({
        resultTocResultId: 11,
        resultId: 101,
        tocResultId: 5,
        tocResultIndicatorId: 'IND-55',
        tocIndicatorTargetId: IITA_ALONE_TARGET_ID,
      });

      mockResultsTocResultRepository.find.mockImplementation((options: any) =>
        Promise.resolve(
          [rowLinkedToIitaAlone].filter((row) =>
            matchesWhere(row, options.where),
          ),
        ),
      );

      const result = await service.loadContributions(
        5,
        'IND-55',
        'reviewed',
        '',
      );

      // Coarse-only behavior: the row is returned, not excluded as if 0 had
      // been passed as a live anchor value.
      expect(result).toEqual([rowLinkedToIitaAlone]);

      const calledWhere =
        mockResultsTocResultRepository.find.mock.calls[0][0].where;
      expect(Array.isArray(calledWhere)).toBe(false);
      expect(
        calledWhere.obj_results_toc_result_indicators
          .obj_result_indicator_targets,
      ).not.toHaveProperty('toc_indicator_target_id');
    });

    it('returns every combination-group row unchanged when no tocIndicatorTargetId is supplied (backward compatibility)', async () => {
      const rowLinkedToIitaAlone = buildContributionRow({
        resultTocResultId: 11,
        resultId: 101,
        tocResultId: 5,
        tocResultIndicatorId: 'IND-55',
        tocIndicatorTargetId: IITA_ALONE_TARGET_ID,
      });

      mockResultsTocResultRepository.find.mockImplementation((options: any) =>
        Promise.resolve(
          [rowLinkedToIitaAlone].filter((row) =>
            matchesWhere(row, options.where),
          ),
        ),
      );

      const result = await service.loadContributions(5, 'IND-55', 'reviewed');

      expect(result).toEqual([rowLinkedToIitaAlone]);
    });
  });

  describe('filterContributorsWithIndicator', () => {
    const contributions = [
      { result_toc_result_id: 11, result_id: 101 },
      { result_toc_result_id: 12, result_id: 102 },
    ];

    it('should return null when no indicator links exist', async () => {
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([]);

      const result = await service.filterContributorsWithIndicator(
        contributions as any,
        'IND-55',
      );

      expect(result).toBeNull();
    });

    it('should return only contributors linked to the indicator', async () => {
      mockResultsTocResultIndicatorsRepository.find.mockResolvedValueOnce([
        { results_toc_results_id: 11 },
      ]);

      const result = await service.filterContributorsWithIndicator(
        contributions as any,
        'IND-55',
      );

      expect(
        mockResultsTocResultIndicatorsRepository.find,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            results_toc_results_id: expect.anything(),
            toc_results_indicator_id: 'IND-55',
            is_active: true,
            is_not_aplicable: false,
          }),
        }),
      );
      expect(result).toEqual([contributions[0]]);
    });
  });
});
