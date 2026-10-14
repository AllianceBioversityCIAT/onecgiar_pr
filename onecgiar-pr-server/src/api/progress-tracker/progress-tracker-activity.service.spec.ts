import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import {
  PT_ACTIVITY_CACHE_TTL_MS,
  ProgressTrackerActivityService,
} from './progress-tracker-activity.service';
import { ProgressTrackerService } from './progress-tracker.service';
import { ProgressTrackerIndicatorMap } from './entities/progress-tracker-indicator-map.entity';
import { Version } from '../versioning/entities/version.entity';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';

function readyCounts(
  status: 'ok' | 'not_found' | 'unavailable',
  items?: unknown[],
) {
  return {
    statusCode: 200 as const,
    message: 'x',
    response: {
      status,
      ...(items ? { items } : {}),
      ...(status === 'ok' ? { generated_at: '2026-10-14T10:00:00Z' } : {}),
    },
  };
}

function mapRow(
  overrides: Partial<ProgressTrackerIndicatorMap> = {},
): ProgressTrackerIndicatorMap {
  return {
    id: 1,
    toc_results_indicator_id: '5d51da6c6916',
    toc_indicator_integration_id: 900123,
    version_id: 42,
    center: 'CIAT',
    pt_indicator_id: '8006329bfd49',
    pt_program_id: 'fdb65d1a595c',
    match_quality: 'exact',
    needs_review: false,
    ...overrides,
  } as ProgressTrackerIndicatorMap;
}

describe('ProgressTrackerActivityService', () => {
  let service: ProgressTrackerActivityService;
  let ptService: { getProgramReadyCounts: jest.Mock };
  let mappingRepository: { find: jest.Mock };
  let versionRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    ptService = { getProgramReadyCounts: jest.fn() };
    mappingRepository = { find: jest.fn().mockResolvedValue([]) };
    versionRepository = { findOne: jest.fn().mockResolvedValue({ id: 42 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressTrackerActivityService,
        { provide: ProgressTrackerService, useValue: ptService },
        {
          provide: getRepositoryToken(ProgressTrackerIndicatorMap),
          useValue: mappingRepository,
        },
        { provide: getRepositoryToken(Version), useValue: versionRepository },
      ],
    }).compile();

    service = module.get(ProgressTrackerActivityService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('joins ready-counts with the active-version map rows into per (indicator, center) items', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(
      readyCounts('ok', [
        { indicator_id: '8006329bfd49', evidence_count: 13 },
        { indicator_id: '906bb71c7c54', evidence_count: 8 },
      ]),
    );
    mappingRepository.find.mockResolvedValue([
      mapRow(),
      mapRow({
        id: 2,
        center: 'IRRI',
        pt_indicator_id: '906bb71c7c54',
        toc_indicator_integration_id: '900124' as any,
      }),
    ]);

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(ptService.getProgramReadyCounts).toHaveBeenCalledWith('SP01', {
      min_evidence: 1,
    });
    expect(versionRepository.findOne).toHaveBeenCalledWith({
      where: {
        status: true,
        is_active: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
    });
    expect(mappingRepository.find).toHaveBeenCalledWith({
      where: {
        version_id: 42,
        pt_indicator_id: In(['8006329bfd49', '906bb71c7c54']),
        is_active: true,
      },
    });
    expect(res).toEqual({
      statusCode: 200,
      message: 'Progress Tracker indicator activity retrieved',
      response: {
        status: 'ok',
        generated_at: '2026-10-14T10:00:00Z',
        items: [
          {
            toc_results_indicator_id: '5d51da6c6916',
            toc_indicator_integration_id: 900123,
            center: 'CIAT',
            matched: true,
            evidence_count: 13,
            pt_indicator_id: '8006329bfd49',
          },
          {
            toc_results_indicator_id: '5d51da6c6916',
            toc_indicator_integration_id: 900124,
            center: 'IRRI',
            matched: true,
            evidence_count: 8,
            pt_indicator_id: '906bb71c7c54',
          },
        ],
      },
    });
  });

  it('marks needs_review and match_quality none rows as not matched (same gate as the proposals route)', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(
      readyCounts('ok', [{ indicator_id: '8006329bfd49', evidence_count: 4 }]),
    );
    mappingRepository.find.mockResolvedValue([
      mapRow({ needs_review: true }),
      mapRow({ id: 2, center: 'IRRI', match_quality: 'none' }),
    ]);

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(res.response.items.map((i) => i.matched)).toEqual([false, false]);
  });

  it('skips malformed and zero-count ready-count items and keeps the highest count for a repeated id', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(
      readyCounts('ok', [
        { indicator_id: '8006329bfd49', evidence_count: 3 },
        { indicator_id: '8006329bfd49', evidence_count: 9 },
        { indicator_id: 'zero', evidence_count: 0 },
        { evidence_count: 5 },
        null,
      ]),
    );
    mappingRepository.find.mockResolvedValue([mapRow()]);

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(
      mappingRepository.find.mock.calls[0][0].where.pt_indicator_id,
    ).toEqual(In(['8006329bfd49']));
    expect(res.response.items[0].evidence_count).toBe(9);
  });

  it('answers ok with no items and no DB read when nothing has evidence', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(readyCounts('ok', []));

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(res.response).toEqual({
      status: 'ok',
      items: [],
      generated_at: '2026-10-14T10:00:00Z',
    });
    expect(mappingRepository.find).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'not_found'] as const)(
    'propagates an upstream %s status with empty items and does not cache it',
    async (status) => {
      ptService.getProgramReadyCounts.mockResolvedValue(readyCounts(status));

      const first = await service.getProgramIndicatorActivity('SP01');
      await service.getProgramIndicatorActivity('SP01');

      expect(first.response).toEqual({ status, items: [] });
      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(2);
      expect(mappingRepository.find).not.toHaveBeenCalled();
    },
  );

  it('answers not_found when there is no active reporting version', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(
      readyCounts('ok', [{ indicator_id: '8006329bfd49', evidence_count: 2 }]),
    );
    versionRepository.findOne.mockResolvedValue(null);

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(res.response).toEqual({ status: 'not_found', items: [] });
  });

  it('degrades a thrown DB error to unavailable without leaking its message', async () => {
    ptService.getProgramReadyCounts.mockResolvedValue(
      readyCounts('ok', [{ indicator_id: '8006329bfd49', evidence_count: 2 }]),
    );
    mappingRepository.find.mockRejectedValue(
      new Error('SENTINEL-DB-HOST connection refused'),
    );

    const res = await service.getProgramIndicatorActivity('SP01');

    expect(res.response).toEqual({ status: 'unavailable', items: [] });
    expect(JSON.stringify(res)).not.toContain('SENTINEL');
  });

  it('answers not_found for a blank program id without calling upstream', async () => {
    const res = await service.getProgramIndicatorActivity('   ');

    expect(res.response.status).toBe('not_found');
    expect(ptService.getProgramReadyCounts).not.toHaveBeenCalled();
  });

  describe('in-memory cache', () => {
    beforeEach(() => {
      ptService.getProgramReadyCounts.mockResolvedValue(
        readyCounts('ok', [
          { indicator_id: '8006329bfd49', evidence_count: 2 },
        ]),
      );
      mappingRepository.find.mockResolvedValue([mapRow()]);
    });

    it('serves an ok answer from memory within the TTL, keyed case-insensitively', async () => {
      const first = await service.getProgramIndicatorActivity('SP01');
      const second = await service.getProgramIndicatorActivity(' sp01 ');

      expect(second).toBe(first);
      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(1);
    });

    it('recomputes after the TTL expires', async () => {
      jest.useFakeTimers({ now: new Date('2026-10-14T10:00:00Z') });
      await service.getProgramIndicatorActivity('SP01');

      jest.setSystemTime(Date.now() + PT_ACTIVITY_CACHE_TTL_MS + 1);
      await service.getProgramIndicatorActivity('SP01');

      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(2);
    });

    it('shares one in-flight computation between concurrent calls', async () => {
      const [a, b] = await Promise.all([
        service.getProgramIndicatorActivity('SP01'),
        service.getProgramIndicatorActivity('SP01'),
      ]);

      expect(a).toBe(b);
      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(1);
    });

    it('clearCache forces a recompute', async () => {
      await service.getProgramIndicatorActivity('SP01');
      service.clearCache();
      await service.getProgramIndicatorActivity('SP01');

      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(2);
    });

    it('keeps programs apart', async () => {
      await service.getProgramIndicatorActivity('SP01');
      await service.getProgramIndicatorActivity('SP02');

      expect(ptService.getProgramReadyCounts).toHaveBeenCalledTimes(2);
    });
  });
});
