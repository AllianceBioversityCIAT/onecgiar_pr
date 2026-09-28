import { Test, TestingModule } from '@nestjs/testing';
import { EvidencesService } from './evidences.service';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { GlobalParameterCacheService } from '../../../shared/services/cache/global-parameter-cache.service';
import { SharePointService } from '../../../shared/services/share-point/share-point.service';
import { EvidenceSharepointRepository } from './repositories/evidence-sharepoint.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { IpsrEvidenceLevelEnum } from '../../../shared/constants/evidence-type.enum';

/**
 * P2-3824 — IPSR Step 3 evidence lists are saved per component and level. The Results
 * replace-all (`updateEvidences`) deactivates by `(result_id, is_supplementary, type)` and would
 * wipe the lists of every other component of the package, so it must never be the one used.
 */
describe('EvidencesService — IPSR Step 3 evidence (P2-3824)', () => {
  let service: EvidencesService;

  const user: TokenDto = { id: 10, email: 'tester@cgiar.org' } as TokenDto;
  const RESULT_ID = 9001;
  const RBIP_ID = 55;

  const mockEvidencesRepository = {
    deactivateIpsrStepThreeEvidences: jest.fn(),
    getIpsrStepThreeEvidences: jest.fn(),
    findIpsrStepThreeEvidenceId: jest.fn(),
    linkIpsrStepThreeEvidence: jest.fn(),
    updateEvidences: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const mockSharepointRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidencesService,
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultRepository, useValue: {} },
        { provide: VersionRepository, useValue: {} },
        { provide: ResultsKnowledgeProductsRepository, useValue: {} },
        { provide: ResultsInnovationsDevRepository, useValue: {} },
        { provide: GlobalParameterCacheService, useValue: {} },
        { provide: SharePointService, useValue: { addFileAccess: jest.fn() } },
        {
          provide: EvidenceSharepointRepository,
          useValue: mockSharepointRepository,
        },
        {
          provide: MQAPService,
          useValue: { getDataFromCGSpaceHandle: jest.fn() },
        },
        { provide: HandlersError, useValue: {} },
      ],
    }).compile();

    service = module.get(EvidencesService);
    jest.clearAllMocks();
    mockEvidencesRepository.save.mockImplementation(async (e) => ({
      ...e,
      id: e.id ?? 700,
    }));
    mockEvidencesRepository.getIpsrStepThreeEvidences.mockResolvedValue([]);
    mockEvidencesRepository.findIpsrStepThreeEvidenceId.mockResolvedValue(null);
  });

  it('deactivates only the removed rows of THIS component and level, never the Results replace-all', async () => {
    mockEvidencesRepository.findIpsrStepThreeEvidenceId.mockResolvedValue(3);
    mockEvidencesRepository.findOne.mockResolvedValue({ id: 3 });

    await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [
        { id: '3', link: 'https://a.org/1' },
        { id: null, link: 'https://a.org/2' },
        { id: null, link: '   ' },
      ] as any,
      user,
    );

    expect(
      mockEvidencesRepository.deactivateIpsrStepThreeEvidences,
    ).toHaveBeenCalledWith(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [3],
      user.id,
    );
    expect(mockEvidencesRepository.updateEvidences).not.toHaveBeenCalled();
    // The blank item is not stored.
    expect(mockEvidencesRepository.save).toHaveBeenCalledTimes(2);
  });

  it('creates a new piece with the Step 3 keys and looks up an existing one only inside its own list', async () => {
    mockEvidencesRepository.findOne.mockResolvedValue(null);

    await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.USE,
      [
        {
          id: '41',
          link: ' https://a.org/x ',
          description: 'Field report',
          gender_related: true,
          innovation_use_related: true,
        },
      ] as any,
      user,
    );

    expect(
      mockEvidencesRepository.findIpsrStepThreeEvidenceId,
    ).toHaveBeenCalledWith(41, RESULT_ID, RBIP_ID, IpsrEvidenceLevelEnum.USE);
    expect(mockEvidencesRepository.findOne).not.toHaveBeenCalled();
    // id 41 belongs to another list: it becomes a NEW row here, it is not moved.
    expect(mockEvidencesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        link: 'https://a.org/x',
        description: 'Field report',
        gender_related: true,
        innovation_use_related: true,
        result_id: RESULT_ID,
        evidence_type_id: 7,
        is_supplementary: false,
        created_by: user.id,
        last_updated_by: user.id,
      }),
    );
    // The component and level live in the child table, never on `evidence`.
    const saved = mockEvidencesRepository.save.mock.calls[0][0];
    expect(saved).not.toHaveProperty('result_by_innovation_package_id');
    expect(saved).not.toHaveProperty('ipsr_evidence_level');
    expect(
      mockEvidencesRepository.linkIpsrStepThreeEvidence,
    ).toHaveBeenCalledWith(700, RBIP_ID, IpsrEvidenceLevelEnum.USE);
  });

  it('updates an existing piece of the same list without re-keying it', async () => {
    const existing = {
      id: 3,
      link: 'https://old.org',
      result_id: RESULT_ID,
      evidence_type_id: 7,
      created_by: 1,
    };
    mockEvidencesRepository.findIpsrStepThreeEvidenceId.mockResolvedValue(3);
    mockEvidencesRepository.findOne.mockResolvedValue(existing);

    await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [{ id: '3', link: 'https://new.org', description: 'd' }] as any,
      user,
    );

    const saved = mockEvidencesRepository.save.mock.calls[0][0];
    expect(saved).toBe(existing);
    expect(saved).toMatchObject({
      link: 'https://new.org',
      description: 'd',
      created_by: 1,
      last_updated_by: user.id,
    });
    expect(mockEvidencesRepository.findOne).toHaveBeenCalledWith({
      where: { id: 3 },
    });
    // Already linked: no second child row.
    expect(
      mockEvidencesRepository.linkIpsrStepThreeEvidence,
    ).not.toHaveBeenCalled();
  });

  it('stores an uploaded file through saveSPData, with an empty link until SharePoint gives one', async () => {
    mockEvidencesRepository.findOne.mockResolvedValue(null);
    const spy = jest.spyOn(service, 'saveSPData').mockResolvedValue(undefined);

    await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [
        {
          id: null,
          link: undefined,
          is_sharepoint: true,
          is_public_file: true,
          sp_document_id: 'doc-1',
          sp_file_name: 'report.pdf',
          sp_folder_path: '/p',
        },
      ] as any,
      user,
    );

    expect(mockEvidencesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ link: '', is_sharepoint: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ sp_document_id: 'doc-1' }),
      700,
    );
  });

  it('returns the first active piece of THIS component and level as read back (the dual-write source)', async () => {
    mockEvidencesRepository.findOne.mockResolvedValue(null);
    mockEvidencesRepository.getIpsrStepThreeEvidences.mockResolvedValue([
      {
        id: 1,
        link: 'https://other-component.org',
        result_by_innovation_package_id: 99,
        ipsr_evidence_level: 'readiness',
      },
      {
        id: 2,
        link: 'https://use-level.org',
        result_by_innovation_package_id: RBIP_ID,
        ipsr_evidence_level: 'use',
      },
      {
        id: 3,
        link: '',
        result_by_innovation_package_id: RBIP_ID,
        ipsr_evidence_level: 'readiness',
      },
      {
        id: 4,
        link: 'https://first.org',
        description: 'first details',
        result_by_innovation_package_id: String(RBIP_ID),
        ipsr_evidence_level: 'readiness',
      },
      {
        id: 5,
        link: 'https://second.org',
        result_by_innovation_package_id: RBIP_ID,
        ipsr_evidence_level: 'readiness',
      },
    ]);

    const { first, failures } = await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [{ id: null, link: 'https://first.org' }] as any,
      user,
    );

    expect(first).toEqual({
      link: 'https://first.org',
      description: 'first details',
    });
    expect(failures).toEqual([]);
  });

  it('an empty list deactivates every piece of the level and returns no first evidence', async () => {
    const result = await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.USE,
      [],
      user,
    );

    expect(
      mockEvidencesRepository.deactivateIpsrStepThreeEvidences,
    ).toHaveBeenCalledWith(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.USE,
      [],
      user.id,
    );
    expect(result).toEqual({ first: null, failures: [] });
  });

  it('keeps saving after one piece fails and reports only that one', async () => {
    mockEvidencesRepository.findOne.mockResolvedValue(null);
    mockEvidencesRepository.save
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementationOnce(async (e) => ({ ...e, id: 801 }));

    const { failures } = await service.saveIpsrStepThreeEvidences(
      RESULT_ID,
      RBIP_ID,
      IpsrEvidenceLevelEnum.READINESS,
      [
        { id: null, link: 'https://bad.org' },
        { id: null, link: 'https://good.org' },
      ] as any,
      user,
    );

    expect(mockEvidencesRepository.save).toHaveBeenCalledTimes(2);
    expect(failures).toEqual(['"https://bad.org": boom']);
  });
});
