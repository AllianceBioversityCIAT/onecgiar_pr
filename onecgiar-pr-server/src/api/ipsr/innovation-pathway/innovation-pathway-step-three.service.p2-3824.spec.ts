import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersioningService } from '../../versioning/versioning.service';
import { EvidencesService } from '../../results/evidences/evidences.service';
import { IpsrEvidenceLevelEnum } from '../../../shared/constants/evidence-type.enum';

/**
 * P2-3824 — IPSR Step 3 evidence lists per component and level.
 *
 * Save: an absent list leaves its level alone (old clients, Step 1); a present one is capped at 6
 * per component, refuses duplicate links, is saved scoped to its component, and its first piece is
 * dual-written to the legacy single-link columns — which a stale single link in the same body must
 * never overwrite. GET: each component carries both lists (legacy link as fallback) and the
 * response names the Impact Areas scored (2) Principal.
 */
describe('InnovationPathwayStepThreeService — Step 3 evidence (P2-3824)', () => {
  let service: InnovationPathwayStepThreeService;

  const RESULT_ID = 9001;
  const CORE = 55;
  const ENABLER = 56;
  const user = { id: 2 } as any;

  const mockResultRepository = { findOne: jest.fn() };
  const mockRIPRepository = { findOne: jest.fn(), update: jest.fn() };
  const mockIpsrRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };
  const emptyFind = () => ({ find: jest.fn().mockResolvedValue([]) });
  const mockActorRepo = emptyFind();
  const mockUseMeasureRepo = emptyFind();
  const mockInstTypeRepo = emptyFind();
  const mockWorkshopRepo = emptyFind();
  const mockEvidenceRepo = {
    getIpsrStepThreeEvidences: jest.fn(),
    findOne: jest.fn(),
  };
  const mockEvidencesService = { saveIpsrStepThreeEvidences: jest.fn() };
  const mockVersioningService = { $_findActivePhase: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepThreeService,
        HandlersError,
        ReturnResponse,
        { provide: ResultRepository, useValue: mockResultRepository },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockRIPRepository,
        },
        { provide: IpsrRepository, useValue: mockIpsrRepository },
        { provide: ResultByIntitutionsRepository, useValue: {} },
        { provide: ResultIpSdgTargetRepository, useValue: {} },
        { provide: ResultsComplementaryInnovationRepository, useValue: {} },
        {
          provide: ResultsByIpInnovationUseMeasureRepository,
          useValue: mockUseMeasureRepo,
        },
        { provide: ResultsIpActorRepository, useValue: mockActorRepo },
        {
          provide: ResultsIpInstitutionTypeRepository,
          useValue: mockInstTypeRepo,
        },
        { provide: EvidencesRepository, useValue: mockEvidenceRepo },
        {
          provide: ResultIpExpertWorkshopOrganizedRepostory,
          useValue: mockWorkshopRepo,
        },
        { provide: VersionsService, useValue: {} },
        { provide: VersioningService, useValue: mockVersioningService },
        { provide: EvidencesService, useValue: mockEvidencesService },
      ],
    }).compile();

    service = module.get(InnovationPathwayStepThreeService);
    jest.clearAllMocks();
  });

  describe('saveComplementaryinnovation', () => {
    const body = (core: any, complementary: any[] = []) =>
      ({
        result_innovation_package: {
          result_innovation_package_id: RESULT_ID,
          assessed_during_expert_workshop_id: 1,
        },
        result_ip_result_core: {
          result_by_innovation_package_id: CORE,
          ...core,
        },
        result_ip_result_complementary: complementary,
        innovatonUse: { actors: [], organization: [], measures: [] },
      }) as any;

    const links = (n: number, prefix: string) =>
      Array.from({ length: n }, (_, i) => ({
        id: null,
        link: `https://${prefix}.org/${i}`,
      }));

    beforeEach(() => {
      mockResultRepository.findOne.mockResolvedValue({ id: RESULT_ID });
      mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 1 });
      mockIpsrRepository.find.mockResolvedValue([
        { result_by_innovation_package_id: CORE },
        { result_by_innovation_package_id: String(ENABLER) },
      ]);
      mockIpsrRepository.findOne.mockResolvedValue(null);
      mockEvidencesService.saveIpsrStepThreeEvidences.mockResolvedValue({
        first: null,
        failures: [],
      });
      jest
        .spyOn(service, 'getStepThree')
        .mockResolvedValue({ response: { ok: true } } as any);
    });

    it('rejects a seventh piece of evidence in one component (readiness + use together) before writing anything', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readiness_evidences: links(4, 'r'),
          use_evidences: links(3, 'u'),
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('at most 6');
      expect(mockRIPRepository.update).not.toHaveBeenCalled();
      expect(mockIpsrRepository.update).not.toHaveBeenCalled();
      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).not.toHaveBeenCalled();
    });

    it('accepts exactly six, and does not count blank items', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readiness_evidences: [...links(3, 'r'), { id: null, link: ' ' }],
          use_evidences: links(3, 'u'),
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.OK);
    });

    it('rejects the same link twice inside one list', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readiness_evidences: [
            { id: null, link: 'https://same.org' },
            { id: null, link: ' https://same.org ' },
          ],
          use_evidences: [],
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockIpsrRepository.update).not.toHaveBeenCalled();
    });

    it('allows one document to back both the readiness and the use level', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readiness_evidences: [{ id: null, link: 'https://same.org' }],
          use_evidences: [{ id: null, link: 'https://same.org' }],
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.OK);
    });

    it('counts the stored rows of an omitted level toward the cap (two separate saves cannot reach 12)', async () => {
      mockEvidenceRepo.getIpsrStepThreeEvidences.mockResolvedValue(
        Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          result_by_innovation_package_id: String(CORE),
          ipsr_evidence_level: IpsrEvidenceLevelEnum.READINESS,
        })),
      );

      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({ use_evidences: links(1, 'u') }),
      );

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('at most 6');
      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).not.toHaveBeenCalled();
    });

    it('allows the same link in two different components', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body(
          { readiness_evidences: [{ id: null, link: 'https://same.org' }] },
          [
            {
              result_by_innovation_package_id: ENABLER,
              readiness_evidences: [{ id: null, link: 'https://same.org' }],
            },
          ],
        ),
      );

      expect(res.statusCode).toBe(HttpStatus.OK);
    });

    it('rejects a component that is not part of this package', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({}, [
          {
            result_by_innovation_package_id: 777,
            use_evidences: [],
          },
        ]),
      );

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockIpsrRepository.update).not.toHaveBeenCalled();
    });

    it('leaves a level alone when its list is absent (old clients) — legacy columns written as before', async () => {
      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readinees_evidence_link: 'https://legacy.org',
          readiness_details_of_evidence: 'legacy',
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockIpsrRepository.find).not.toHaveBeenCalled();
      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).not.toHaveBeenCalled();
      expect(mockIpsrRepository.update).toHaveBeenCalledTimes(1);
      expect(mockIpsrRepository.update).toHaveBeenCalledWith(
        CORE,
        expect.objectContaining({
          readinees_evidence_link: 'https://legacy.org',
          readiness_details_of_evidence: 'legacy',
        }),
      );
    });

    it('saves each present list scoped to its component and dual-writes the first piece; a stale single link never wins', async () => {
      mockEvidencesService.saveIpsrStepThreeEvidences.mockImplementation(
        async (_r, rbip, level) =>
          rbip === CORE && level === IpsrEvidenceLevelEnum.READINESS
            ? {
                first: { link: 'https://first.org', description: 'first' },
                failures: [],
              }
            : { first: null, failures: [] },
      );

      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          readinees_evidence_link: 'https://stale.org',
          readiness_details_of_evidence: 'stale',
          use_evidence_link: 'https://stale-use.org',
          readiness_evidences: [
            { id: '3', link: 'https://first.org' },
            { id: null, link: '' },
          ],
          use_evidences: [],
        }),
      );

      expect(res.statusCode).toBe(HttpStatus.OK);

      // The step's own write no longer carries the legacy single link of either level.
      const [, stepValues] = mockIpsrRepository.update.mock.calls[0];
      expect(stepValues).not.toHaveProperty('readinees_evidence_link');
      expect(stepValues).not.toHaveProperty('readiness_details_of_evidence');
      expect(stepValues).not.toHaveProperty('use_evidence_link');
      expect(stepValues).not.toHaveProperty('use_details_of_evidence');

      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).toHaveBeenCalledWith(
        RESULT_ID,
        CORE,
        IpsrEvidenceLevelEnum.READINESS,
        [{ id: '3', link: 'https://first.org' }],
        user,
      );
      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).toHaveBeenCalledWith(
        RESULT_ID,
        CORE,
        IpsrEvidenceLevelEnum.USE,
        [],
        user,
      );

      expect(mockIpsrRepository.update).toHaveBeenCalledWith(CORE, {
        readinees_evidence_link: 'https://first.org',
        readiness_details_of_evidence: 'first',
        last_updated_by: user.id,
      });
      // Empty list → the legacy columns go back to NULL.
      expect(mockIpsrRepository.update).toHaveBeenCalledWith(CORE, {
        use_evidence_link: null,
        use_details_of_evidence: null,
        last_updated_by: user.id,
      });
    });

    it('dual-writes and saves every component before reporting the pieces that failed', async () => {
      mockEvidencesService.saveIpsrStepThreeEvidences
        .mockResolvedValueOnce({
          first: { link: 'https://ok.org', description: null },
          failures: ['"report.pdf": SharePoint down'],
        })
        .mockResolvedValueOnce({ first: null, failures: [] });

      const res = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({ readiness_evidences: [{ id: null, link: 'https://ok.org' }] }, [
          {
            result_by_innovation_package_id: ENABLER,
            use_evidences: [{ id: null, link: 'https://e.org' }],
          },
        ]),
      );

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('report.pdf');
      expect(
        mockEvidencesService.saveIpsrStepThreeEvidences,
      ).toHaveBeenCalledTimes(2);
      expect(mockIpsrRepository.update).toHaveBeenCalledWith(
        CORE,
        expect.objectContaining({ readinees_evidence_link: 'https://ok.org' }),
      );
    });
  });

  describe('getStepThree', () => {
    beforeEach(() => {
      mockRIPRepository.findOne.mockResolvedValue({
        result_innovation_package_id: RESULT_ID,
        obj_result_innovation_package: {
          gender_tag_level_id: 3,
          climate_change_tag_level_id: '3',
          nutrition_tag_level_id: 2,
          environmental_biodiversity_tag_level_id: 3,
          poverty_tag_level_id: null,
        },
      });
      mockIpsrRepository.findOne.mockResolvedValue({
        result_by_innovation_package_id: CORE,
        result_id: 100,
        readinees_evidence_link: ' https://legacy.org ',
        readiness_details_of_evidence: 'legacy details',
        use_evidence_link: 'https://legacy-use.org',
      });
      mockResultRepository.findOne.mockResolvedValue({
        result_code: 1,
        title: 'Core',
        version_id: 34,
      });
      mockIpsrRepository.find.mockResolvedValue([
        {
          result_by_innovation_package_id: ENABLER,
          readinees_evidence_link: null,
          use_evidence_link: '',
        },
      ]);
      mockEvidenceRepo.getIpsrStepThreeEvidences.mockResolvedValue([
        {
          id: '11',
          link: 'https://use.org',
          description: null,
          is_sharepoint: 0,
          is_public_file: null,
          gender_related: 1,
          youth_related: null,
          nutrition_related: 0,
          environmental_biodiversity_related: null,
          poverty_related: null,
          innovation_use_related: 1,
          result_by_innovation_package_id: String(CORE),
          ipsr_evidence_level: 'use',
        },
        {
          id: 12,
          link: 'https://sp.org/file',
          description: 'file',
          is_sharepoint: 1,
          is_public_file: 0,
          sp_document_id: 'doc',
          sp_evidence_id: 4,
          sp_file_name: 'f.pdf',
          sp_folder_path: '/x',
          result_by_innovation_package_id: ENABLER,
          ipsr_evidence_level: 'readiness',
        },
      ]);
    });

    it('returns both lists per component, with the legacy link as fallback, and the principal Impact Areas', async () => {
      const res: any = await service.getStepThree(RESULT_ID);

      expect(res.status).toBe(HttpStatus.OK);
      expect(mockEvidenceRepo.getIpsrStepThreeEvidences).toHaveBeenCalledWith(
        RESULT_ID,
      );

      const core = res.response.result_ip_result_core;
      expect(core.readiness_evidences).toEqual([
        expect.objectContaining({
          id: null,
          link: 'https://legacy.org',
          description: 'legacy details',
          is_sharepoint: false,
          gender_related: false,
          innovation_use_related: false,
          legacy: true,
        }),
      ]);
      // The level HAS a row: the legacy column is not shown on top of it.
      expect(core.use_evidences).toEqual([
        {
          id: 11,
          link: 'https://use.org',
          description: null,
          is_sharepoint: false,
          is_public_file: null,
          sp_document_id: null,
          sp_evidence_id: null,
          sp_file_name: null,
          sp_folder_path: null,
          gender_related: true,
          youth_related: false,
          nutrition_related: false,
          environmental_biodiversity_related: false,
          poverty_related: false,
          innovation_use_related: true,
        },
      ]);

      const [enabler] = res.response.result_ip_result_complementary;
      expect(enabler.readiness_evidences).toEqual([
        expect.objectContaining({
          id: 12,
          is_sharepoint: true,
          is_public_file: false,
          sp_document_id: 'doc',
          sp_file_name: 'f.pdf',
        }),
      ]);
      expect(enabler.use_evidences).toEqual([]);

      expect(res.response.principal_impact_areas).toEqual([
        'gender',
        'climate',
        'environment',
      ]);
    });
  });
});
