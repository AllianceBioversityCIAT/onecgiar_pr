import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  PT_PREFILL_MAX_EVIDENCE_LINKS,
  ProgressTrackerPrefillService,
} from './progress-tracker-prefill.service';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ClarisaInstitution } from '../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { EvidenceTypeEnum } from '../../shared/constants/evidence-type.enum';

// PTB-R-18a (2026-10-19) — evidence links + matched partners saved best-effort after create.
describe('ProgressTrackerPrefillService', () => {
  const evidenceRepo = {
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
  };
  const rbiRepo = {
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
  };
  const clarisaRepo = { find: jest.fn() };
  let service: ProgressTrackerPrefillService;

  beforeEach(async () => {
    jest.clearAllMocks();
    evidenceRepo.find.mockResolvedValue([]);
    rbiRepo.find.mockResolvedValue([]);
    clarisaRepo.find.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        ProgressTrackerPrefillService,
        { provide: getRepositoryToken(Evidence), useValue: evidenceRepo },
        {
          provide: getRepositoryToken(ResultsByInstitution),
          useValue: rbiRepo,
        },
        {
          provide: getRepositoryToken(ClarisaInstitution),
          useValue: clarisaRepo,
        },
      ],
    }).compile();
    service = module.get(ProgressTrackerPrefillService);
  });

  describe('sanitize', () => {
    it('keeps http(s) links only, deduped and capped, and positive integer partner ids', () => {
      const out = ProgressTrackerPrefillService.sanitize({
        evidence_links: [
          { url: 'javascript:alert(1)' },
          { url: 'ftp://x.org/a' },
          { url: 'https://a.org/x', title: ' X ' },
          { url: 'https://A.org/x/' },
          ...Array.from({ length: 10 }, (_, i) => ({
            url: `http://b.org/${i}`,
          })),
        ],
        partners: [
          { clarisa_id: 7, name: 'Org' },
          { clarisa_id: '7' },
          { clarisa_id: -1 },
          { clarisa_id: 'abc' },
          { clarisa_id: 8 },
        ],
        unexpected: 'dropped',
      });
      expect(out.evidence_links[0]).toEqual({
        url: 'https://a.org/x',
        title: 'X',
      });
      expect(out.evidence_links).toHaveLength(PT_PREFILL_MAX_EVIDENCE_LINKS);
      expect(out.partners).toEqual([
        { clarisa_id: 7, name: 'Org' },
        { clarisa_id: 8, name: '#8' },
      ]);
    });

    it('tolerates garbage', () => {
      expect(ProgressTrackerPrefillService.sanitize(null)).toEqual({
        evidence_links: [],
        partners: [],
      });
      expect(ProgressTrackerPrefillService.sanitize('x')).toEqual({
        evidence_links: [],
        partners: [],
      });
    });
  });

  it('saves links as MAIN evidences without files, skipping ones the result already has', async () => {
    evidenceRepo.find.mockResolvedValue([{ id: 1, link: 'https://a.org/x' }]);
    const summary = await service.apply(
      101,
      {
        evidence_links: [
          { url: 'https://a.org/x/', title: 'dup' },
          { url: 'https://b.org/y', title: 'Y' },
        ],
      },
      10,
      false,
    );
    expect(summary.evidence_links_saved).toBe(1);
    expect(evidenceRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        link: 'https://b.org/y',
        description: 'Y',
        result_id: 101,
        evidence_type_id: EvidenceTypeEnum.MAIN,
        is_sharepoint: 0,
        is_supplementary: false,
        created_by: 10,
      }),
    ]);
  });

  it('saves only valid, active, non-center CLARISA partners as predicted, with the partner role and no delivery', async () => {
    clarisaRepo.find.mockResolvedValue([
      { id: 7, is_active: true, clarisa_center: null },
      { id: 8, is_active: false, clarisa_center: null },
      { id: 9, is_active: true, clarisa_center: { code: 'C-1' } },
      { id: 46, is_active: true, clarisa_center: null },
    ]);
    const summary = await service.apply(
      101,
      {
        partners: [
          { clarisa_id: 7, name: 'Good' },
          { clarisa_id: 8, name: 'Inactive' },
          { clarisa_id: 9, name: 'A center' },
          { clarisa_id: 46, name: 'Excluded' },
          { clarisa_id: 99, name: 'Unknown' },
        ],
      },
      10,
      false,
    );
    expect(summary.partners_saved).toBe(1);
    expect(summary.partners_skipped).toEqual([
      'Inactive',
      'A center',
      'Excluded',
      'Unknown',
    ]);
    const [rows] = rbiRepo.save.mock.calls[0];
    expect(rows).toEqual([
      {
        result_id: 101,
        institutions_id: 7,
        institution_roles_id: InstitutionRoleEnum.PARTNER,
        is_predicted: true,
        from_toc: false,
        is_active: true,
        created_by: 10,
        last_updated_by: 10,
      },
    ]);
    expect(rows[0]).not.toHaveProperty('delivery');
  });

  it('uses the KP contributor role for a knowledge product and skips partners already linked', async () => {
    clarisaRepo.find.mockResolvedValue([
      { id: 7, is_active: true, clarisa_center: null },
      { id: 8, is_active: true, clarisa_center: null },
    ]);
    rbiRepo.find.mockResolvedValue([{ id: 1, institutions_id: 8 }]);
    const summary = await service.apply(
      101,
      {
        partners: [
          { clarisa_id: 7, name: 'A' },
          { clarisa_id: 8, name: 'B' },
        ],
      },
      10,
      true,
    );
    expect(summary.partners_saved).toBe(1);
    expect(rbiRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          institution_roles_id:
            InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
        }),
      }),
    );
    expect(rbiRepo.save.mock.calls[0][0][0]).toMatchObject({
      institutions_id: 7,
      institution_roles_id:
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
    });
  });

  it('never throws: a DB failure is reported as skipped partners and the links still save', async () => {
    clarisaRepo.find.mockRejectedValue(new Error('db down'));
    const summary = await service.apply(
      101,
      {
        evidence_links: [{ url: 'https://a.org/x' }],
        partners: [{ clarisa_id: 7, name: 'Org' }],
      },
      10,
      false,
    );
    expect(summary).toEqual({
      evidence_links_saved: 1,
      partners_saved: 0,
      partners_skipped: ['Org'],
    });
  });

  it('never throws when the evidence save fails', async () => {
    evidenceRepo.find.mockRejectedValue(new Error('db down'));
    await expect(
      service.apply(
        101,
        { evidence_links: [{ url: 'https://a.org/x' }] },
        10,
        false,
      ),
    ).resolves.toMatchObject({ evidence_links_saved: 0 });
  });
});
