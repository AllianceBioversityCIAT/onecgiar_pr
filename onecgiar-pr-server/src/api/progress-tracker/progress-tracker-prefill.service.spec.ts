import { HttpStatus } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  PT_PREFILL_MAX_EVIDENCE_LINKS,
  PT_TEMPORARY_EVIDENCE_PREFIX,
  ProgressTrackerPrefillService,
} from './progress-tracker-prefill.service';
import { Result } from '../results/entities/result.entity';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { ClarisaCountry } from '../../clarisa/clarisa-countries/entities/clarisa-country.entity';
import { ClarisaRegion } from '../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { ClarisaSubnationalScope } from '../../clarisa/clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
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
  const resultRepo = { findOne: jest.fn(), update: jest.fn() };
  const resultCountryRepo = { count: jest.fn() };
  const resultRegionRepo = { count: jest.fn() };
  const clarisaCountryRepo = { find: jest.fn() };
  const clarisaRegionRepo = { find: jest.fn() };
  const clarisaSubnationalRepo = { find: jest.fn() };
  const geographicLocation = { saveGeoScopeV2: jest.fn() };
  const moduleRef = { get: jest.fn(() => geographicLocation) };
  let service: ProgressTrackerPrefillService;

  beforeEach(async () => {
    jest.clearAllMocks();
    evidenceRepo.find.mockResolvedValue([]);
    rbiRepo.find.mockResolvedValue([]);
    clarisaRepo.find.mockResolvedValue([]);
    resultRepo.findOne.mockResolvedValue({
      id: 101,
      geographic_scope_id: null,
    });
    resultRepo.update.mockResolvedValue({});
    resultCountryRepo.count.mockResolvedValue(0);
    resultRegionRepo.count.mockResolvedValue(0);
    clarisaCountryRepo.find.mockResolvedValue([]);
    clarisaRegionRepo.find.mockResolvedValue([]);
    clarisaSubnationalRepo.find.mockResolvedValue([]);
    geographicLocation.saveGeoScopeV2.mockResolvedValue({
      status: HttpStatus.OK,
    });
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
        { provide: getRepositoryToken(Result), useValue: resultRepo },
        {
          provide: getRepositoryToken(ResultCountry),
          useValue: resultCountryRepo,
        },
        {
          provide: getRepositoryToken(ResultRegion),
          useValue: resultRegionRepo,
        },
        {
          provide: getRepositoryToken(ClarisaCountry),
          useValue: clarisaCountryRepo,
        },
        {
          provide: getRepositoryToken(ClarisaRegion),
          useValue: clarisaRegionRepo,
        },
        {
          provide: getRepositoryToken(ClarisaSubnationalScope),
          useValue: clarisaSubnationalRepo,
        },
        { provide: ModuleRef, useValue: moduleRef },
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
      const empty = {
        evidence_links: [],
        partners: [],
        geography: null,
        impact_areas: {},
      };
      expect(ProgressTrackerPrefillService.sanitize(null)).toEqual(empty);
      expect(ProgressTrackerPrefillService.sanitize('x')).toEqual(empty);
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
        description: '[Temporary — from Progress Tracker, may be incomplete] Y',
        result_id: 101,
        evidence_type_id: EvidenceTypeEnum.MAIN,
        is_sharepoint: 0,
        is_supplementary: false,
        created_by: 10,
      }),
    ]);
  });

  it('flags every PT evidence as temporary in its description, also when the link has no title', async () => {
    evidenceRepo.find.mockResolvedValue([]);
    await service.apply(
      101,
      {
        evidence_links: [
          { url: 'https://c.org/z', title: '  Field report  ' },
          { url: 'https://d.org/w' },
        ],
      },
      10,
      false,
    );
    const saved = evidenceRepo.save.mock.calls.at(-1)[0];
    expect(
      saved.map((row: { description: string }) => row.description),
    ).toEqual([
      `${PT_TEMPORARY_EVIDENCE_PREFIX} Field report`,
      PT_TEMPORARY_EVIDENCE_PREFIX,
    ]);
    expect(PT_TEMPORARY_EVIDENCE_PREFIX).toBe(
      '[Temporary — from Progress Tracker, may be incomplete]',
    );
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
    expect(summary).toMatchObject({
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

  // PTB-R-18b (2026-10-19) — geography + impact-area scores, best-effort and never overwriting.
  describe('geography (PTB-R-18b)', () => {
    const country = (id: number, iso: string, name: string) => ({
      clarisa_id: id,
      iso_alpha_2: iso,
      name,
    });

    it('sanitizes the block: only PRMS focus ids 1/2/3/5, positive ids, deduped', () => {
      expect(
        ProgressTrackerPrefillService.sanitize({
          geography: { geo_scope_id: 4 },
        }).geography,
      ).toBeNull();
      expect(
        ProgressTrackerPrefillService.sanitize({
          geography: {
            geo_scope_id: '3',
            countries: [
              country(466, 'ml', 'Mali'),
              country(466, 'ML', 'Mali again'),
              { clarisa_id: 'x', name: 'Bad' },
            ],
            regions: [{ id: 0 }],
            subnational: [{}, { code: ' ML-1 ' }],
          },
        }).geography,
      ).toEqual({
        geo_scope_id: 3,
        countries: [{ clarisa_id: 466, iso_alpha_2: 'ML', name: 'Mali' }],
        regions: [],
        subnational: [{ code: 'ML-1', clarisa_id: null }],
      });
    });

    it('saves a multinational Country focus with the CLARISA-valid countries through the v2 save, skipping unknown or ISO-inconsistent ones', async () => {
      clarisaCountryRepo.find.mockResolvedValue([
        { id: 466, iso_alpha_2: 'ML' },
        { id: 508, iso_alpha_2: 'MZ' },
        { id: 700, iso_alpha_2: 'KE' },
      ]);
      const summary = await service.apply(
        101,
        {
          geography: {
            geo_scope_id: 3,
            countries: [
              country(466, 'ML', 'Mali'),
              country(508, 'MZ', 'Mozambique'),
              country(700, 'TZ', 'Wrong ISO'),
              country(999, 'AQ', 'Atlantis'),
            ],
          },
        },
        10,
        false,
      );
      expect(summary).toMatchObject({
        geography_applied: 3,
        geography_skipped_reason: null,
        geography_skipped: ['Wrong ISO', 'Atlantis'],
      });
      expect(moduleRef.get).toHaveBeenCalled();
      const [dto, user] = geographicLocation.saveGeoScopeV2.mock.calls[0];
      expect(user).toEqual({ id: 10 });
      expect(dto).toMatchObject({
        result_id: 101,
        geo_scope_id: 3,
        has_countries: true,
        has_regions: false,
        regions: [],
        countries: [{ id: 466 }, { id: 508 }],
        extra_geo_scope_id: null,
        has_extra_countries: false,
        has_extra_regions: false,
      });
    });

    it('saves Global with no countries or regions', async () => {
      const summary = await service.apply(
        101,
        { geography: { geo_scope_id: 1 } },
        10,
        false,
      );
      expect(summary.geography_applied).toBe(1);
      expect(geographicLocation.saveGeoScopeV2.mock.calls[0][0]).toMatchObject({
        geo_scope_id: 1,
        countries: [],
        regions: [],
        has_countries: false,
      });
    });

    it('saves Regional with only the CLARISA regions that exist (an empty list is still Regional)', async () => {
      clarisaRegionRepo.find.mockResolvedValue([{ um49Code: 2 }]);
      const summary = await service.apply(
        101,
        {
          geography: {
            geo_scope_id: 2,
            regions: [
              { id: 2, name: 'Africa' },
              { id: 9999, name: 'Nowhere' },
            ],
          },
        },
        10,
        false,
      );
      expect(summary).toMatchObject({
        geography_applied: 2,
        geography_skipped: ['Nowhere'],
      });
      expect(geographicLocation.saveGeoScopeV2.mock.calls[0][0]).toMatchObject({
        geo_scope_id: 2,
        has_regions: true,
        regions: [{ id: 2 }],
      });
    });

    it('saves Sub-national with the areas of matched countries, and falls back to Country when none resolves', async () => {
      clarisaCountryRepo.find.mockResolvedValue([
        { id: 700, iso_alpha_2: 'KE' },
      ]);
      clarisaSubnationalRepo.find.mockResolvedValue([
        { id: 1, code: 'KE-01', country_id: 700 },
        { id: 2, code: 'UG-01', country_id: 800 },
      ]);
      const summary = await service.apply(
        101,
        {
          geography: {
            geo_scope_id: 5,
            countries: [country(700, 'KE', 'Kenya')],
            subnational: [{ code: 'KE-01' }, { code: 'UG-01' }],
          },
        },
        10,
        false,
      );
      expect(summary).toMatchObject({
        geography_applied: 5,
        geography_skipped: ['UG-01'],
      });
      expect(geographicLocation.saveGeoScopeV2.mock.calls[0][0]).toMatchObject({
        geo_scope_id: 5,
        countries: [{ id: 700, sub_national: [{ code: 'KE-01' }] }],
      });

      geographicLocation.saveGeoScopeV2.mockClear();
      clarisaSubnationalRepo.find.mockResolvedValue([]);
      const fallback = await service.apply(
        101,
        {
          geography: {
            geo_scope_id: 5,
            countries: [country(700, 'KE', 'Kenya')],
            subnational: [{ code: 'KE-99' }],
          },
        },
        10,
        false,
      );
      expect(fallback.geography_applied).toBe(3);
      expect(geographicLocation.saveGeoScopeV2.mock.calls[0][0]).toMatchObject({
        geo_scope_id: 3,
        countries: [{ id: 700 }],
      });
      expect(
        geographicLocation.saveGeoScopeV2.mock.calls[0][0].countries[0],
      ).not.toHaveProperty('sub_national');
    });

    it('writes nothing when a Country focus is left with no valid country', async () => {
      const summary = await service.apply(
        101,
        {
          geography: {
            geo_scope_id: 3,
            countries: [country(999, 'AQ', 'Atlantis')],
          },
        },
        10,
        false,
      );
      expect(summary).toMatchObject({
        geography_applied: null,
        geography_skipped_reason: 'no_valid_location',
        geography_skipped: ['Atlantis'],
      });
      expect(geographicLocation.saveGeoScopeV2).not.toHaveBeenCalled();
    });

    it.each([
      ['a focus', { id: 101, geographic_scope_id: 1 }, 0, 0],
      ['an active country', { id: 101, geographic_scope_id: null }, 1, 0],
      ['an active region', { id: 101, geographic_scope_id: null }, 0, 1],
    ])(
      'never overwrites a result that already has %s',
      async (_label, row, countries, regions) => {
        resultRepo.findOne.mockResolvedValue(row);
        resultCountryRepo.count.mockResolvedValue(countries);
        resultRegionRepo.count.mockResolvedValue(regions);
        const summary = await service.apply(
          101,
          { geography: { geo_scope_id: 1 } },
          10,
          false,
        );
        expect(summary).toMatchObject({
          geography_applied: null,
          geography_skipped_reason: 'not_empty',
        });
        expect(geographicLocation.saveGeoScopeV2).not.toHaveBeenCalled();
      },
    );

    it('never throws: a failed or non-OK save is reported, and the rest of the block still applies', async () => {
      geographicLocation.saveGeoScopeV2.mockResolvedValueOnce({
        status: HttpStatus.BAD_REQUEST,
      });
      const failed = await service.apply(
        101,
        {
          geography: { geo_scope_id: 1 },
          evidence_links: [{ url: 'https://a.org/x' }],
        },
        10,
        false,
      );
      expect(failed).toMatchObject({
        geography_applied: null,
        geography_skipped_reason: 'failed',
        evidence_links_saved: 1,
      });

      resultCountryRepo.count.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.apply(
          101,
          { geography: { geo_scope_id: 1 }, impact_areas: { gender: 1 } },
          10,
          false,
        ),
      ).resolves.toMatchObject({
        geography_skipped_reason: 'failed',
        impact_areas_applied: ['gender'],
      });
    });
  });

  describe('impact-area scores (PTB-R-18b)', () => {
    it('sanitizes to the five PT keys and the 0/1/2 scale only', () => {
      expect(
        ProgressTrackerPrefillService.sanitize({
          impact_areas: {
            gender: 0,
            climate: 2,
            nutrition: '1',
            environment: 3,
            poverty: null,
            water: 1,
          },
        }).impact_areas,
      ).toEqual({ gender: 0, climate: 2 });
    });

    it('maps score 0/1/2 to tag level 1/2/3 on the result columns, only where still empty', async () => {
      resultRepo.findOne.mockResolvedValue({
        id: 101,
        gender_tag_level_id: null,
        climate_change_tag_level_id: 3,
        nutrition_tag_level_id: null,
        environmental_biodiversity_tag_level_id: null,
        poverty_tag_level_id: null,
      });
      const summary = await service.apply(
        101,
        {
          impact_areas: {
            gender: 0,
            climate: 1,
            nutrition: 2,
            environment: 1,
            poverty: 0,
          },
        },
        10,
        false,
      );
      expect(summary.impact_areas_applied).toEqual([
        'gender',
        'nutrition',
        'environment',
        'poverty',
      ]);
      expect(summary.impact_areas_skipped).toEqual(['climate']);
      expect(resultRepo.update).toHaveBeenCalledWith(101, {
        gender_tag_level_id: 1,
        nutrition_tag_level_id: 3,
        environmental_biodiversity_tag_level_id: 2,
        poverty_tag_level_id: 1,
        last_updated_by: 10,
      });
    });

    it('writes nothing when every score is already set, and never throws on a failure', async () => {
      resultRepo.findOne.mockResolvedValue({ id: 101, gender_tag_level_id: 2 });
      const kept = await service.apply(
        101,
        { impact_areas: { gender: 0 } },
        10,
        false,
      );
      expect(kept.impact_areas_skipped).toEqual(['gender']);
      expect(resultRepo.update).not.toHaveBeenCalled();

      resultRepo.findOne.mockRejectedValue(new Error('db down'));
      await expect(
        service.apply(101, { impact_areas: { poverty: 2 } }, 10, false),
      ).resolves.toMatchObject({
        impact_areas_applied: [],
        impact_areas_skipped: ['poverty'],
      });
    });
  });
});
