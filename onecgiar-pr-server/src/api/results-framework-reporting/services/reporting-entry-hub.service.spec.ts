import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportingEntryHubService } from './reporting-entry-hub.service';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { YearRepository } from '../../results/years/year.repository';
import { BilateralProjectsService } from '../../bilateral/services/bilateral-projects.service';
import { HandlersError } from '../../../shared/handlers/error.utils';

const ACTIVE_YEAR = 2026;
const USER_ID = 42;

const centerRoleRow = (
  code: string,
  name: string,
  acronym: string,
  overrides: Record<string, unknown> = {},
) => ({
  role_level_name: 'Center',
  center_id: code,
  center_name: name,
  center_acronym: acronym,
  ...overrides,
});

const project = (
  // ClarisaProject.id is a bigint PK — the MySQL driver hands the service a
  // string id at runtime (KZ-OPF-1 class), never a number.
  id: string,
  shortName: string,
  sciencePrograms: Array<{ programCode: string; allocation: string }>,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  shortName,
  fullName: `Full name for ${shortName}`,
  summary: 'summary',
  description: 'description',
  leadCenter: { id: 1, name: 'Some Center', acronym: 'SC' },
  sciencePrograms: sciencePrograms.map((sp, index) => ({
    programId: index + 1,
    programCode: sp.programCode,
    allocation: sp.allocation,
  })),
  ...overrides,
});

describe('ReportingEntryHubService', () => {
  let service: ReportingEntryHubService;
  let initiativeRepo: { findOne: jest.Mock };
  let roleByUserRepo: { getAllRolesByUser: jest.Mock };
  let yearRepo: { findOne: jest.Mock };
  let bilateralProjectsService: { getProjectsByCenter: jest.Mock };

  beforeEach(async () => {
    initiativeRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, official_code: 'SP02' }),
    };
    roleByUserRepo = { getAllRolesByUser: jest.fn().mockResolvedValue([]) };
    yearRepo = {
      findOne: jest.fn().mockResolvedValue({ year: ACTIVE_YEAR, active: true }),
    };
    bilateralProjectsService = {
      getProjectsByCenter: jest.fn().mockResolvedValue({ projects: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingEntryHubService,
        { provide: ClarisaInitiativesRepository, useValue: initiativeRepo },
        { provide: RoleByUserRepository, useValue: roleByUserRepo },
        { provide: YearRepository, useValue: yearRepo },
        {
          provide: BilateralProjectsService,
          useValue: bilateralProjectsService,
        },
        HandlersError,
      ],
    }).compile();

    service = module.get(ReportingEntryHubService);
  });

  // (a) user in C1+C2, C3 has SP02 projects -> response has C1, C2 only.
  it('scopes centers to the caller role_by_user rows, never a center the caller is not assigned to', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Center One', 'C1A'),
      centerRoleRow('C2', 'Center Two', 'C2A'),
      // Non-Center role row that happens to carry C3's center_id — the
      // role_level_name === 'Center' filter must discard it, not just the
      // "no center_id" check, or C3 would leak into the response.
      {
        role_level_name: 'Initiative',
        center_id: 'C3',
        center_name: 'Center Three',
        center_acronym: 'C3A',
      },
    ]);
    bilateralProjectsService.getProjectsByCenter.mockImplementation((code) => {
      if (code === 'C1') {
        return Promise.resolve({
          projects: [
            project('1', 'B-A1', [
              { programCode: 'SP02', allocation: '50.00' },
            ]),
          ],
        });
      }
      if (code === 'C2') {
        return Promise.resolve({
          projects: [
            project('2', 'B-A2', [
              { programCode: 'SP02', allocation: '30.00' },
            ]),
          ],
        });
      }
      throw new Error(`unexpected center code ${code}`);
    });

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledTimes(
      2,
    );
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      'C1',
    );
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      'C2',
    );
    expect(
      bilateralProjectsService.getProjectsByCenter,
    ).not.toHaveBeenCalledWith('C3');
    expect(
      result.response.centers.map((c: { code: string }) => c.code).sort(),
    ).toEqual(['C1', 'C2']);
  });

  // (b) total/matching per center.
  it('computes total (M, all active projects) and matching (N, allocated to the program) per center', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Center One', 'C1A'),
    ]);
    bilateralProjectsService.getProjectsByCenter.mockResolvedValue({
      projects: [
        project('1', 'B-A1', [{ programCode: 'SP02', allocation: '50.00' }]),
        project('2', 'B-A2', [{ programCode: 'SP01', allocation: '10.00' }]),
        project('3', 'B-A3', []),
      ],
    });

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    const center = result.response.centers[0];
    expect(center.total).toBe(3);
    expect(center.matching).toBe(1);
    expect(center.projects).toHaveLength(1);
    expect(center.projects[0].id).toBe('1');
  });

  // (c) sort by allocation desc then shortName, string fixture allocations '100'/'40'/'9'
  // (a lexical sort puts '9' first -> FAIL).
  it('sorts matching projects by numeric allocation desc, never lexical', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Center One', 'C1A'),
    ]);
    bilateralProjectsService.getProjectsByCenter.mockResolvedValue({
      projects: [
        project('1', 'B-A9', [{ programCode: 'SP02', allocation: '9' }]),
        project('2', 'B-A100', [{ programCode: 'SP02', allocation: '100' }]),
        project('3', 'B-A40', [{ programCode: 'SP02', allocation: '40' }]),
      ],
    });

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    expect(
      result.response.centers[0].projects.map(
        (p: { allocation: number }) => p.allocation,
      ),
    ).toEqual([100, 40, 9]);
  });

  // (d) sp02 lower-case matches.
  it('matches the program code case-insensitively', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Center One', 'C1A'),
    ]);
    bilateralProjectsService.getProjectsByCenter.mockResolvedValue({
      projects: [
        project('1', 'B-A1', [{ programCode: 'SP02', allocation: '50.00' }]),
      ],
    });

    const result = await service.getMyCenterProjects(USER_ID, 'sp02');

    expect(result.response.programCode).toBe('SP02');
    expect(result.response.centers[0].matching).toBe(1);
  });

  // (e) no Center rows -> centers: [], no getProjectsByCenter call.
  it('returns centers: [] and never calls getProjectsByCenter when the caller has no Center role', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      { role_level_name: 'Initiative', center_id: undefined },
    ]);

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    expect(result.response.centers).toEqual([]);
    expect(result.response.truncated).toBe(false);
    expect(bilateralProjectsService.getProjectsByCenter).not.toHaveBeenCalled();
  });

  // (f) cap: 301 mocked projects -> 300 + truncated: true, center order preserved.
  it('caps the response at 300 projects total, truncated: true, preserving center order', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Alpha', 'A1'),
      centerRoleRow('C2', 'Bravo', 'B1'),
    ]);

    const makeProjects = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) =>
        project(String(i + 1), `${prefix}-${i + 1}`, [
          { programCode: 'SP02', allocation: '10.00' },
        ]),
      );

    bilateralProjectsService.getProjectsByCenter.mockImplementation((code) => {
      // Bravo (C2) has more matches than Alpha (C1) -> sorted first (matching desc).
      if (code === 'C1')
        return Promise.resolve({ projects: makeProjects(100, 'ALPHA') });
      if (code === 'C2')
        return Promise.resolve({ projects: makeProjects(201, 'BRAVO') });
      throw new Error(`unexpected center code ${code}`);
    });

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    expect(result.response.truncated).toBe(true);
    const totalReturned = result.response.centers.reduce(
      (sum: number, c: { projects: unknown[] }) => sum + c.projects.length,
      0,
    );
    expect(totalReturned).toBe(300);
    // Order preserved (Bravo sorts first because matching=201 > 100): its
    // full 201 matches are kept, and Alpha's tail is cut to the remaining 99.
    expect(
      result.response.centers.map((c: { code: string }) => c.code),
    ).toEqual(['C2', 'C1']);
    expect(result.response.centers[0].projects).toHaveLength(201);
    expect(result.response.centers[1].projects).toHaveLength(99);
  });

  // (g) one center rejects -> that center error: true, total: 0, matching: 0, others intact.
  it('marks a failed center lookup as error: true without failing the whole call', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      centerRoleRow('C1', 'Center One', 'C1A'),
      centerRoleRow('C2', 'Center Two', 'C2A'),
    ]);
    bilateralProjectsService.getProjectsByCenter.mockImplementation((code) => {
      if (code === 'C1') return Promise.reject(new Error('boom'));
      return Promise.resolve({
        projects: [
          project('1', 'B-A1', [{ programCode: 'SP02', allocation: '50.00' }]),
        ],
      });
    });

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    const failed = result.response.centers.find(
      (c: { code: string }) => c.code === 'C1',
    );
    const ok = result.response.centers.find(
      (c: { code: string }) => c.code === 'C2',
    );

    expect(failed).toEqual(
      expect.objectContaining({
        code: 'C1',
        error: true,
        total: 0,
        matching: 0,
        projects: [],
      }),
    );
    expect(ok).toEqual(
      expect.objectContaining({ code: 'C2', total: 1, matching: 1 }),
    );
  });

  // (h) unknown program -> 404.
  it('returns 404 when the program code has no active clarisa_initiatives row', async () => {
    initiativeRepo.findOne.mockResolvedValue(null);

    const result = await service.getMyCenterProjects(USER_ID, 'SP99');

    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  // (i) roles rows without a center_id key (legacy fallback shape) -> rejects with 500,
  // getProjectsByCenter not called.
  it('treats a legacy roles shape (no center_id key at all) as a lookup error, never as no centers', async () => {
    roleByUserRepo.getAllRolesByUser.mockResolvedValue([
      {
        role_id: 9,
        role_level_id: 3,
        role_level_name: 'Center',
        description: 'Center User',
        initiative_id: null,
        action_area_id: null,
      },
    ]);

    const result = await service.getMyCenterProjects(USER_ID, 'SP02');

    expect(result.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(bilateralProjectsService.getProjectsByCenter).not.toHaveBeenCalled();
  });

  it('returns 400 when programId is empty', async () => {
    const result = await service.getMyCenterProjects(USER_ID, '   ');

    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
    expect(initiativeRepo.findOne).not.toHaveBeenCalled();
  });
});
