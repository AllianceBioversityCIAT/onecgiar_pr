import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BilateralProjectsService } from './bilateral-projects.service';
import { ClarisaProject } from '../../../clarisa/clarisa-projects/entity/clarisa-projects.entity';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';
import { YearRepository } from '../../results/years/year.repository';

const CURRENT_YEAR = 2026;

describe('BilateralProjectsService', () => {
  let service: BilateralProjectsService;
  let projectRepo: { find: jest.Mock };
  let centerRepo: { findOne: jest.Mock };
  let yearRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    projectRepo = { find: jest.fn().mockResolvedValue([]) };
    centerRepo = { findOne: jest.fn().mockResolvedValue(null) };
    yearRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ year: CURRENT_YEAR, active: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralProjectsService,
        { provide: getRepositoryToken(ClarisaProject), useValue: projectRepo },
        { provide: getRepositoryToken(ClarisaCenter), useValue: centerRepo },
        { provide: YearRepository, useValue: yearRepo },
      ],
    }).compile();

    service = module.get(BilateralProjectsService);
  });

  it('returns empty projects when center is not found', async () => {
    const result = await service.getProjectsByCenter(999);
    expect(result).toEqual({ projects: [] });
  });

  it('returns empty projects when there is no active year configured', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-99',
      institutionId: 5,
    });
    yearRepo.findOne.mockResolvedValueOnce(null);

    const result = await service.getProjectsByCenter(5);

    expect(result).toEqual({ projects: [] });
    expect(projectRepo.find).not.toHaveBeenCalled();
  });

  it('matches on organizationCode alone and skips the alias fallback query', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-99',
      institutionId: 5,
    });
    projectRepo.find.mockResolvedValueOnce([
      {
        id: 1,
        isActive: true,
        phase: CURRENT_YEAR,
        obj_organization: { id: 5, name: 'X', acronym: 'X' },
        obj_project_mappings: [
          {
            programId: 1,
            programCode: 'SP01',
            allocation: '50.00',
            programName: 'Breeding for Tomorrow',
            programShortName: 'BfT',
          },
        ],
      },
    ]);

    const result = await service.getProjectsByCenter(5);

    // CENTER-99 is not a real center / has no entry in the alias map -> the fallback query is skipped.
    expect(projectRepo.find).toHaveBeenCalledTimes(1);
    expect(result.projects[0].sciencePrograms[0]).toEqual({
      programId: 1,
      programCode: 'SP01',
      allocation: '50.00',
      spName: 'Breeding for Tomorrow',
      spShortName: 'BfT',
    });
  });

  it('falls back on source_center_acronym when organizationCode is null and the center matches an alias', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-03',
      institutionId: 46,
    });
    projectRepo.find
      .mockResolvedValueOnce([]) // primary organizationCode query
      .mockResolvedValueOnce([
        {
          id: 42,
          isActive: true,
          phase: CURRENT_YEAR,
          obj_organization: null,
          obj_project_mappings: [],
        },
      ]); // fallback source_center_acronym query

    const result = await service.getProjectsByCenter(46);

    expect(projectRepo.find).toHaveBeenCalledTimes(2);
    expect(result.projects.map((p) => p.id)).toEqual([42]);
  });

  it('dedupes when a project appears in both the primary and fallback result sets', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-03',
      institutionId: 46,
    });
    const project = {
      id: 7,
      isActive: true,
      phase: CURRENT_YEAR,
      obj_organization: null,
      obj_project_mappings: [],
    };
    projectRepo.find
      .mockResolvedValueOnce([project])
      .mockResolvedValueOnce([project]);

    const result = await service.getProjectsByCenter(46);

    expect(result.projects).toHaveLength(1);
  });

  it('falls back to programCode when programName/programShortName are null', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-99',
      institutionId: 5,
    });
    projectRepo.find.mockResolvedValueOnce([
      {
        id: 2,
        isActive: true,
        phase: CURRENT_YEAR,
        obj_organization: null,
        obj_project_mappings: [
          {
            programId: 2,
            programCode: 'SP02',
            allocation: '30.00',
            programName: null,
            programShortName: null,
          },
        ],
      },
    ]);

    const result = await service.getProjectsByCenter(5);

    expect(result.projects[0].sciencePrograms[0].spName).toBe('SP02');
    expect(result.projects[0].sciencePrograms[0].spShortName).toBe('SP02');
  });

  it('excludes projects whose phase does not match the current active year', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-99',
      institutionId: 5,
    });
    projectRepo.find.mockResolvedValueOnce([
      {
        id: 3,
        isActive: true,
        phase: 2025, // legacy phase, active year is 2026 in this test suite
        obj_organization: null,
        obj_project_mappings: [],
      },
    ]);

    const result = await service.getProjectsByCenter(5);

    expect(result.projects).toEqual([]);
  });

  it('only returns the subset of projects matching the current phase when phases are mixed', async () => {
    centerRepo.findOne.mockResolvedValueOnce({
      code: 'CENTER-99',
      institutionId: 5,
    });
    projectRepo.find.mockResolvedValueOnce([
      {
        id: 4,
        isActive: true,
        phase: 2025,
        obj_organization: null,
        obj_project_mappings: [],
      },
      {
        id: 5,
        isActive: true,
        phase: CURRENT_YEAR,
        obj_organization: null,
        obj_project_mappings: [],
      },
    ]);

    const result = await service.getProjectsByCenter(5);

    expect(result.projects.map((p) => p.id)).toEqual([5]);
  });
});
