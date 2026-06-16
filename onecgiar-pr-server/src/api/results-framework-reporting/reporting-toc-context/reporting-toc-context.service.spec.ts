import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'process';
import { YearRepository } from '../../results/years/year.repository';
import { ReportingTocContextService } from './reporting-toc-context.service';

describe('ReportingTocContextService', () => {
  let service: ReportingTocContextService;
  let yearRepository: jest.Mocked<Pick<YearRepository, 'findOne'>>;
  let dataSourceQueryMock: jest.Mock;

  beforeAll(() => {
    env.DB_NAME = 'prdb_test';
  });

  beforeEach(() => {
    yearRepository = {
      findOne: jest.fn(),
    };
    dataSourceQueryMock = jest.fn();
    const dataSource = {
      query: dataSourceQueryMock,
    } as unknown as DataSource;

    service = new ReportingTocContextService(
      yearRepository as unknown as YearRepository,
      dataSource,
    );
  });

  it('should resolve context from active year and matching version phase', async () => {
    yearRepository.findOne.mockResolvedValue({ year: 2026 } as any);
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
    expect(yearRepository.findOne).not.toHaveBeenCalled();
  });

  it('should fail when no active reporting year exists', async () => {
    yearRepository.findOne.mockResolvedValue(null);

    await expect(service.resolve()).rejects.toMatchObject({
      message: 'No active reporting year was found.',
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('should fail when version has no toc_pahse_id for the reporting year', async () => {
    yearRepository.findOne.mockResolvedValue({ year: 2026 } as any);
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
    yearRepository.findOne.mockResolvedValue({ year: 2026 } as any);
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
});
