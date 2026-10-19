import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('ClarisaProjectsRepository', () => {
  let repository: ClarisaProjectsRepository;

  const mockDataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
    query: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRepository: jest.fn(),
  };

  beforeEach(async () => {
    mockDataSource.query.mockReset();
    mockHandlersError.returnErrorRepository.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaProjectsRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
      ],
    }).compile();

    repository = module.get<ClarisaProjectsRepository>(
      ClarisaProjectsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getPortfolioProjectFacts', () => {
    const squash = (sql: string) => sql.replace(/\s+/g, ' ').trim();

    const run = async (rows: any[] = []) => {
      mockDataSource.query.mockResolvedValue(rows);
      const result = await repository.getPortfolioProjectFacts(2026, 7);
      const [sql, params] = mockDataSource.query.mock.calls[0];
      return { result, sql: squash(sql), params };
    };

    it('binds [approvedStatuses, API, version, Discontinued, Result, version, year] in order', async () => {
      const { params } = await run();
      expect(params).toEqual([['Confirmed'], 'API', 7, 4, 'Result', 7, 2026]);
    });

    it('compares mapping status case-sensitively on the trimmed value', async () => {
      const { sql } = await run();
      expect(sql).toContain('BINARY TRIM(cpm.status) IN (?)');
    });

    it('keeps only positive allocations and non-blank codes', async () => {
      const { sql } = await run();
      expect(sql).toContain('cpm.allocation > 0');
      expect(sql).not.toContain('allocation >= 0');
      expect(sql).toContain("TRIM(cpm.program_code) <> ''");
      expect(sql).toContain('GROUP_CONCAT(DISTINCT TRIM(cpm.program_code))');
    });

    it('treats a NULL project is_active as active', async () => {
      const { sql } = await run();
      expect(sql).toContain('(cp.is_active IS NULL OR cp.is_active <> 0)');
      expect(sql).toContain('cp.phase = ?');
    });

    it('counts a NULL result status as W3 and excludes Discontinued', async () => {
      const { sql } = await run();
      expect(sql).toContain('(r.status_id IS NULL OR r.status_id <> ?)');
    });

    it('requires active links and results in both probes', async () => {
      const { sql } = await run();
      expect(sql.match(/rbp\.is_active = 1/g)).toHaveLength(2);
      expect(sql.match(/r\.is_active = 1/g)).toHaveLength(2);
    });

    it('applies no status filter to the W1/W2 probe', async () => {
      const { sql } = await run();
      const w1w2End = sql.indexOf('AS has_w1w2');
      const w1w2 = sql.slice(sql.lastIndexOf('EXISTS', w1w2End), w1w2End);
      expect(w1w2.length).toBeGreaterThan(0);
      expect(w1w2).not.toContain('status_id');
      expect(sql.match(/status_id/g)).toHaveLength(2);
    });

    it('uses no string interpolation', async () => {
      const { sql } = await run();
      expect(sql).not.toContain('${');
      expect(sql.match(/\?/g)).toHaveLength(7);
    });

    it('maps rows: splits and trims codes, drops blanks, coerces flags', async () => {
      const { result } = await run([
        {
          id: '12',
          organization_code: '5',
          source_center_acronym: 'CIAT',
          approved_program_codes: ' SP01, ,SP04',
          has_bilateral: '1',
          has_w1w2: 0,
        },
        {
          id: 13,
          organization_code: null,
          source_center_acronym: null,
          approved_program_codes: null,
          has_bilateral: 0,
          has_w1w2: '1',
        },
      ]);
      expect(result[0]).toEqual({
        id: 12,
        organizationCode: 5,
        sourceCenterAcronym: 'CIAT',
        approvedProgramCodes: ['SP01', 'SP04'],
        hasBilateral: true,
        hasW1w2: false,
      });
      expect(result[1]).toEqual({
        id: 13,
        organizationCode: null,
        sourceCenterAcronym: null,
        approvedProgramCodes: [],
        hasBilateral: false,
        hasW1w2: true,
      });
    });

    it('routes failures through returnErrorRepository without SQL text', async () => {
      const boom = new Error('db down');
      const mapped = { status: 500 };
      mockDataSource.query.mockRejectedValue(boom);
      mockHandlersError.returnErrorRepository.mockReturnValue(mapped);
      await expect(repository.getPortfolioProjectFacts(2026, 7)).rejects.toBe(
        mapped,
      );
      expect(mockHandlersError.returnErrorRepository).toHaveBeenCalledWith({
        error: boom,
        className: ClarisaProjectsRepository.name,
        debug: true,
      });
    });
  });
});
