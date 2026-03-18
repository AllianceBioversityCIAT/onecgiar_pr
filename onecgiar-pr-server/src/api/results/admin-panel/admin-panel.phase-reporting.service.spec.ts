import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpStatus } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Repository } from 'typeorm';
import { AdminPanelService } from './admin-panel.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { AdminPanelRepository } from './admin-panel.repository';
import { ResultRepository } from '../result.repository';
import { ResultsPolicyChangesRepository } from '../summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsUseRepository } from '../summary/repositories/results-innovations-use.repository';
import { ResultsCapacityDevelopmentsRepository } from '../summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { PhaseInitiativeReportingAccess } from './entities/phase-initiative-reporting-access.entity';
import { Version } from '../../versioning/entities/version.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

describe('AdminPanelService — phase initiative reporting (P2-2821)', () => {
  let service: AdminPanelService;
  let versionRepo: jest.Mocked<Pick<Repository<Version>, 'findOne'>>;
  let accessRepo: jest.Mocked<
    Pick<
      Repository<PhaseInitiativeReportingAccess>,
      'find' | 'findOne' | 'delete' | 'upsert'
    >
  >;
  let initiativeRepo: jest.Mocked<Pick<Repository<ClarisaInitiative>, 'find'>>;

  const mockPhase = (overrides: Partial<Version> = {}): Version =>
    ({
      id: 100,
      app_module_id: 1,
      phase_name: 'Reporting 2025',
      phase_year: 2025,
      status: true,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      portfolio_id: 5,
      obj_portfolio: {
        id: 5,
        name: 'P25',
        acronym: 'P25',
      } as Version['obj_portfolio'],
      ...overrides,
    }) as Version;

  const mockInitiative = (id: number, typeName: string): ClarisaInitiative =>
    ({
      id,
      official_code: `SP0${id}`,
      name: `Program ${id}`,
      active: true,
      portfolio_id: 5,
      obj_cgiar_entity_type: {
        name: typeName,
      } as ClarisaInitiative['obj_cgiar_entity_type'],
    }) as ClarisaInitiative;

  beforeEach(async () => {
    versionRepo = { findOne: jest.fn() };
    accessRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    initiativeRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminPanelService,
        {
          provide: HandlersError,
          useValue: {
            returnErrorRes: jest.fn(() => ({
              status: HttpStatus.INTERNAL_SERVER_ERROR,
              message: 'INTERNAL_SERVER_ERROR',
              response: { error: true },
            })),
          },
        },
        { provide: AdminPanelRepository, useValue: {} },
        {
          provide: ModuleRef,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              findByFilterActiveKps: jest.fn(),
              getSectionSevenDataForReport: jest.fn(),
              syncAgain: jest.fn(),
            }),
          },
        },
        { provide: ResultRepository, useValue: {} },
        { provide: ResultsPolicyChangesRepository, useValue: {} },
        { provide: ResultsInnovationsUseRepository, useValue: {} },
        { provide: ResultsCapacityDevelopmentsRepository, useValue: {} },
        { provide: ResultsInnovationsDevRepository, useValue: {} },
        {
          provide: getRepositoryToken(PhaseInitiativeReportingAccess),
          useValue: accessRepo,
        },
        { provide: getRepositoryToken(Version), useValue: versionRepo },
        {
          provide: getRepositoryToken(ClarisaInitiative),
          useValue: initiativeRepo,
        },
      ],
    }).compile();

    service = module.get(AdminPanelService);
    await service.onModuleInit();
  });

  describe('getPhaseReportingInitiativesDetail', () => {
    it('returns 404 when phase does not exist or is not reporting module', async () => {
      versionRepo.findOne.mockResolvedValue(null);
      const res = await service.getPhaseReportingInitiativesDetail(999);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toBe('Reporting phase not found');
    });

    it('returns phase and science_programs with default reporting_enabled true', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
        mockInitiative(2, 'Accelerators'),
      ]);
      accessRepo.find.mockResolvedValue([]);
      const res = await service.getPhaseReportingInitiativesDetail(100);
      expect(res.status).toBe(HttpStatus.OK);
      const body = res.response as {
        phase: { phase_name: string };
        science_programs: { reporting_enabled: boolean }[];
      };
      expect(body.phase.phase_name).toBe('Reporting 2025');
      expect(body.science_programs).toHaveLength(2);
      expect(body.science_programs.every((p) => p.reporting_enabled)).toBe(
        true,
      );
    });

    it('applies override when access row has reporting_enabled false', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      accessRepo.find.mockResolvedValue([
        {
          initiative_id: 1,
          reporting_enabled: false,
        } as PhaseInitiativeReportingAccess,
      ]);
      const res = await service.getPhaseReportingInitiativesDetail(100);
      expect(
        (res.response as { science_programs: { reporting_enabled: boolean }[] })
          .science_programs[0].reporting_enabled,
      ).toBe(false);
    });

    it('returns empty science_programs when phase has no portfolio_id', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase({ portfolio_id: null }));
      const res = await service.getPhaseReportingInitiativesDetail(100);
      expect(
        (res.response as { science_programs: unknown[] }).science_programs,
      ).toEqual([]);
    });
  });

  describe('getInitiativeReportingStatus', () => {
    it('returns 404 for unknown phase', async () => {
      versionRepo.findOne.mockResolvedValue(null);
      const res = await service.getInitiativeReportingStatus(1, 1);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when initiative not in eligible list', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([]);
      const res = await service.getInitiativeReportingStatus(100, 99);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns reporting_enabled from row or default true', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      accessRepo.findOne.mockResolvedValue(null);
      let res = await service.getInitiativeReportingStatus(100, 1);
      expect(
        (res.response as { reporting_enabled: boolean }).reporting_enabled,
      ).toBe(true);
      accessRepo.findOne.mockResolvedValue({
        reporting_enabled: false,
      } as PhaseInitiativeReportingAccess);
      res = await service.getInitiativeReportingStatus(100, 1);
      expect(
        (res.response as { reporting_enabled: boolean }).reporting_enabled,
      ).toBe(false);
    });
  });

  describe('patchPhaseInitiativeReporting', () => {
    it('returns 400 when phase is closed', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase({ status: false }));
      const res = await service.patchPhaseInitiativeReporting(100, 1, {
        reporting_enabled: false,
      });
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('delete override when enabling reporting for one initiative', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      const res = await service.patchPhaseInitiativeReporting(100, 1, {
        reporting_enabled: true,
      });
      expect(accessRepo.delete).toHaveBeenCalledWith({
        version_id: 100,
        initiative_id: 1,
      });
      expect(res.status).toBe(HttpStatus.OK);
      expect(
        (res.response as { reporting_enabled: boolean }).reporting_enabled,
      ).toBe(true);
    });

    it('upsert when disabling reporting', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      const res = await service.patchPhaseInitiativeReporting(100, 1, {
        reporting_enabled: false,
      });
      expect(accessRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          version_id: 100,
          initiative_id: 1,
          reporting_enabled: false,
        }),
        { conflictPaths: ['version_id', 'initiative_id'] },
      );
      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe('patchPhaseInitiativeReportingBulk', () => {
    it('deletes all overrides when opening all', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      accessRepo.find.mockResolvedValue([]);
      const res = await service.patchPhaseInitiativeReportingBulk(100, {
        reporting_enabled: true,
      });
      expect(accessRepo.delete).toHaveBeenCalledWith({ version_id: 100 });
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response.every((p) => p.reporting_enabled)).toBe(true);
    });

    it('upserts all initiatives when closing all', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      const inits = [
        mockInitiative(1, 'Science programs'),
        mockInitiative(2, 'Accelerators'),
      ];
      initiativeRepo.find.mockResolvedValue(inits);
      accessRepo.find.mockResolvedValue(
        inits.map(
          (i) =>
            ({
              initiative_id: i.id,
              reporting_enabled: false,
            }) as PhaseInitiativeReportingAccess,
        ),
      );
      const res = await service.patchPhaseInitiativeReportingBulk(100, {
        reporting_enabled: false,
      });
      expect(accessRepo.upsert).toHaveBeenCalled();
      expect(res.response.every((p) => !p.reporting_enabled)).toBe(true);
    });
  });

  describe('isInitiativeReportingEnabled', () => {
    it('returns false when phase closed or missing', async () => {
      versionRepo.findOne.mockResolvedValue(null);
      expect(await service.isInitiativeReportingEnabled(1, 1)).toBe(false);
      versionRepo.findOne.mockResolvedValue(mockPhase({ status: false }));
      expect(await service.isInitiativeReportingEnabled(100, 1)).toBe(false);
    });

    it('returns false when initiative not eligible', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([]);
      expect(await service.isInitiativeReportingEnabled(100, 1)).toBe(false);
    });

    it('returns true by default when no access row', async () => {
      versionRepo.findOne.mockResolvedValue(mockPhase());
      initiativeRepo.find.mockResolvedValue([
        mockInitiative(1, 'Science programs'),
      ]);
      accessRepo.findOne.mockResolvedValue(null);
      expect(await service.isInitiativeReportingEnabled(100, 1)).toBe(true);
    });
  });
});
