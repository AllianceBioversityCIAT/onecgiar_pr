import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'node:process';
import { YearRepository } from '../../results/years/year.repository';
import { ReportingTocContextService } from './reporting-toc-context.service';

describe('ReportingTocContextService', () => {
  let service: ReportingTocContextService;
  let findOneMock: jest.Mock;
  let yearRepository: YearRepository;
  let dataSourceQueryMock: jest.Mock;

  beforeAll(() => {
    env.DB_NAME = 'prdb_test';
  });

  beforeEach(() => {
    findOneMock = jest.fn();
    yearRepository = { findOne: findOneMock } as unknown as YearRepository;
    dataSourceQueryMock = jest.fn();
    const dataSource = {
      query: dataSourceQueryMock,
    } as unknown as DataSource;

    service = new ReportingTocContextService(yearRepository, dataSource);
  });

  it('should resolve context from active year and matching version phase', async () => {
    findOneMock.mockResolvedValue({ year: 2026 });
    dataSourceQueryMock.mockResolvedValue([
      {
        id: 42,
        toc_pahse_id: '7baf200a-c958-4ded-9894-6557a94cae18',
        phase_year: 2026,
        phase_name: 'Reporting 2026',
      },
    ]);

    const context = await service.resolve();

    expect(context).toEqual({
      reportingYear: 2026,
      phaseUuid: '7baf200a-c958-4ded-9894-6557a94cae18',
      versionId: 42,
      phaseName: 'Reporting 2026',
    });
    expect(dataSourceQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM `prdb_test`.`version` v'),
      [1, 2026],
    );
  });

  it('should resolve context for an explicit year override without reading active year', async () => {
    dataSourceQueryMock.mockResolvedValue([
      {
        id: 10,
        toc_pahse_id: '99134294-d7a1-4966-a63e-227c9e29b9fb',
        phase_year: 2025,
        phase_name: 'Reporting 2025',
      },
    ]);

    const context = await service.resolve(2025);

    expect(context.reportingYear).toBe(2025);
    expect(context.phaseUuid).toBe('99134294-d7a1-4966-a63e-227c9e29b9fb');
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('should fail when no active reporting year exists', async () => {
    findOneMock.mockResolvedValue(null);

    await expect(service.resolve()).rejects.toMatchObject({
      message: 'No active reporting year was found.',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should fail when version has no toc_pahse_id for the reporting year', async () => {
    findOneMock.mockResolvedValue({ year: 2026 });
    dataSourceQueryMock.mockResolvedValue([
      {
        id: 99,
        toc_pahse_id: null,
        phase_year: 2026,
        phase_name: 'Reporting 2026',
      },
    ]);

    await expect(service.resolve()).rejects.toMatchObject({
      message: 'No TOC phase is configured for reporting year 2026.',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should fail when version row is missing for the reporting year', async () => {
    findOneMock.mockResolvedValue({ year: 2026 });
    dataSourceQueryMock.mockResolvedValue([]);

    await expect(service.resolve()).rejects.toMatchObject({
      message: 'No TOC phase is configured for reporting year 2026.',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should reject invalid year overrides', async () => {
    await expect(service.resolve(-1)).rejects.toMatchObject({
      message: 'The reporting year must be a valid positive integer.',
      status: HttpStatus.BAD_REQUEST,
    });
  });

  describe('resolveByVersionId (OPF-R-6)', () => {
    it('should resolve context directly from the version row for an explicit versionId', async () => {
      dataSourceQueryMock.mockResolvedValue([
        {
          id: 34,
          toc_pahse_id: '99134294-d7a1-4966-a63e-227c9e29b9fb',
          phase_year: 2025,
          phase_name: 'Reporting 2025',
        },
      ]);

      const context = await service.resolveByVersionId(34);

      expect(context).toEqual({
        reportingYear: 2025,
        phaseUuid: '99134294-d7a1-4966-a63e-227c9e29b9fb',
        versionId: 34,
        phaseName: 'Reporting 2025',
      });
      expect(findOneMock).not.toHaveBeenCalled();
    });

    it('should bind exactly one placeholder per parameter (KZ-W12-1)', async () => {
      dataSourceQueryMock.mockResolvedValue([
        {
          id: 34,
          toc_pahse_id: '99134294-d7a1-4966-a63e-227c9e29b9fb',
          phase_year: 2025,
          phase_name: 'Reporting 2025',
        },
      ]);

      await service.resolveByVersionId(34);

      const [sql, params] = dataSourceQueryMock.mock.calls[0];
      const placeholderCount = (sql.match(/\?/g) ?? []).length;
      expect(placeholderCount).toBe(params.length);
      expect(sql).toContain('FROM `prdb_test`.`version` v');
      expect(sql).toContain('v.id = ?');
      expect(params).toEqual([1, 34]);
    });

    it('should resolve the row matching versionId even when another row shares its phase_year but not its toc_pahse_id (KZ-TCM-1)', async () => {
      // Two version rows for the SAME phase_year, DIFFERENT toc_pahse_id — a
      // year-equality implementation (`WHERE phase_year = ?`) cannot tell these
      // apart; only reading by `id` (this fixture's `WHERE v.id = ?`) can.
      const rowsById: Record<number, unknown> = {
        34: {
          id: 34,
          toc_pahse_id: 'PHASE-34-UUID',
          phase_year: 2025,
          phase_name: 'Reporting 2025 (row 34)',
        },
        40: {
          id: 40,
          toc_pahse_id: 'PHASE-40-UUID',
          phase_year: 2025,
          phase_name: 'Reporting 2025 (row 40)',
        },
      };

      dataSourceQueryMock.mockImplementation(
        (_sql: string, params: unknown[]) => {
          const requestedId = params[1] as number;
          const row = rowsById[requestedId];
          return Promise.resolve(row ? [row] : []);
        },
      );

      const context = await service.resolveByVersionId(34);

      expect(context).toEqual({
        reportingYear: 2025,
        phaseUuid: 'PHASE-34-UUID',
        versionId: 34,
        phaseName: 'Reporting 2025 (row 34)',
      });
      expect(context.phaseUuid).not.toBe('PHASE-40-UUID');
    });

    it('should reject a non-numeric versionId with a 4xx', async () => {
      await expect(service.resolveByVersionId(NaN)).rejects.toMatchObject({
        message: 'The versionId must be a valid positive integer.',
        status: HttpStatus.BAD_REQUEST,
      });
      expect(dataSourceQueryMock).not.toHaveBeenCalled();
    });

    it('should reject an unknown versionId with a 4xx (not an empty 200)', async () => {
      dataSourceQueryMock.mockResolvedValue([]);

      await expect(service.resolveByVersionId(9999)).rejects.toMatchObject({
        message: 'No version was found for versionId 9999.',
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('should reject a version row with no configured ToC phase', async () => {
      dataSourceQueryMock.mockResolvedValue([
        {
          id: 50,
          toc_pahse_id: null,
          phase_year: 2024,
          phase_name: 'Reporting 2024',
        },
      ]);

      await expect(service.resolveByVersionId(50)).rejects.toMatchObject({
        message: 'No TOC phase is configured for version 50.',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
