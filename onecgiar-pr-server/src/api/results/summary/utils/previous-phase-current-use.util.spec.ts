import { InnovationUseService } from '../../../results-framework-reporting/innovation-use/innovation-use.service';
import {
  currentUseActorCount,
  currentUseRows,
  summarizePreviousPhaseCurrentUse,
} from './previous-phase-current-use.util';

/**
 * P2-3985 — the "Previous reported use" figure, shared by the v2 read (W1/W2) and the legacy summary
 * read (W3/bilateral). The two screens must show the same number for the same result.
 */
describe('previous-phase current use util (P2-3985)', () => {
  it('counts women + men on a disaggregated row and the typed how_many otherwise', () => {
    expect(currentUseActorCount({ women: 120, men: 80, how_many: 1 })).toBe(
      200,
    );
    expect(
      currentUseActorCount({ sex_and_age_disaggregation: true, how_many: 300 }),
    ).toBe(300);
    expect(currentUseActorCount({ women: 'abc', men: null })).toBe(0);
  });

  it('returns null without a previous result or without current-use actors', () => {
    const rows = [{ section_id: 1, women: 1, men: 1 }];
    expect(summarizePreviousPhaseCurrentUse(rows, null, 2025)).toBeNull();
    expect(summarizePreviousPhaseCurrentUse(rows, 0, 2025)).toBeNull();
    expect(summarizePreviousPhaseCurrentUse([], 41, 2025)).toBeNull();
    expect(
      summarizePreviousPhaseCurrentUse([{ section_id: 2, women: 9 }], 41, 2025),
    ).toBeNull();
  });

  it('counts NULL-section rows by default (legacy writer), but not with the v2 filter', () => {
    const rows = [
      { section_id: null, women: 10, men: 10 },
      { section_id: 1, women: 1, men: 1 },
      { section_id: 2, women: 900, men: 900 },
    ];
    expect(summarizePreviousPhaseCurrentUse(rows, 41, 2025)?.total_actors).toBe(
      22,
    );
    expect(
      summarizePreviousPhaseCurrentUse(
        rows,
        41,
        2025,
        undefined,
        currentUseRows,
      )?.total_actors,
    ).toBe(2);
  });

  it('keeps the phase year null when it is unknown, never 0', () => {
    const rows = [{ section_id: 1, women: 1, men: 1 }];
    expect(
      summarizePreviousPhaseCurrentUse(rows, 41, null)?.phase_year,
    ).toBeNull();
    expect(
      summarizePreviousPhaseCurrentUse(rows, 41, undefined)?.phase_year,
    ).toBeNull();
  });

  it('gives the same total as the v2 read for the same raw rows', async () => {
    const rawRows = () => [
      { section_id: 1, women: 120, men: 80, women_youth: 20, men_youth: 10 },
      // women missing but youth typed: getActorsData rewrites `women` — the count must still match.
      { section_id: 1, women: null, men: 5, women_youth: 7, men_youth: 0 },
      { section_id: 1, sex_and_age_disaggregation: true, how_many: 300 },
      { section_id: 2, women: 5000, men: 5000 },
    ];
    const v2: any = Object.create(InnovationUseService.prototype);
    v2.logger = { error: jest.fn(), warn: jest.fn() };
    v2._resultActorRepository = {
      find: jest.fn().mockResolvedValue(rawRows()),
    };
    v2._resultByIntitutionsTypeRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    v2._resultIpMeasureRepository = { find: jest.fn().mockResolvedValue([]) };

    const fromV2 = await v2.getPreviousPhaseCurrentUse(41, 2025);
    const fromUtil = summarizePreviousPhaseCurrentUse(rawRows(), 41, 2025);

    expect(fromUtil).toEqual({
      result_id: 41,
      phase_year: 2025,
      total_actors: 505,
      total_organizations: 0,
      measures: [],
    });
    expect(fromV2.total_actors).toBe(fromUtil.total_actors);
    expect(fromV2.phase_year).toBe(fromUtil.phase_year);
  });

  describe('IU26-R-4 per-category previous use', () => {
    const actors = [
      { section_id: 1, sex_and_age_disaggregation: true, how_many: 100 },
      { section_id: null, sex_and_age_disaggregation: true, how_many: 50 },
      { section_id: 2, sex_and_age_disaggregation: true, how_many: 999 },
    ];
    const orgs = [
      { section_id: 1, institution_roles_id: 5, is_active: true, how_many: 9 },
      { section_id: 1, institution_roles_id: 2, is_active: true, how_many: 30 },
      { section_id: 1, institution_roles_id: 5, is_active: false, how_many: 7 },
      { section_id: 2, institution_roles_id: 5, is_active: true, how_many: 80 },
    ];
    const measures = [
      {
        section_id: 1,
        is_active: true,
        unit_of_measure: 'Hectares',
        quantity: 4000,
      },
      {
        section_id: 1,
        is_active: true,
        unit_of_measure: 'hectares ',
        quantity: 100,
      },
      {
        section_id: 1,
        is_active: true,
        unit_of_measure: 'Trees',
        quantity: 500,
      },
      {
        section_id: 2,
        is_active: true,
        unit_of_measure: 'Hectares',
        quantity: 77,
      },
    ];
    const v2 = (rows = actors, o = orgs, m = measures) =>
      summarizePreviousPhaseCurrentUse(
        rows,
        41,
        2025,
        undefined,
        currentUseRows,
        o,
        m,
      );

    it('v2: role-5 current-use organizations and units grouped case/space-insensitively', () => {
      expect(v2()).toEqual({
        result_id: 41,
        phase_year: 2025,
        total_actors: 100,
        total_organizations: 9,
        measures: [
          { unit: 'Hectares', quantity: 4100 },
          { unit: 'Trees', quantity: 500 },
        ],
      });
    });

    it('legacy: NULL-section actors count (150), organizations and measures follow the same pick', () => {
      const r = summarizePreviousPhaseCurrentUse(
        actors,
        41,
        2025,
        undefined,
        undefined,
        orgs,
        measures,
      );
      expect(r?.total_actors).toBe(150);
      expect(r?.total_organizations).toBe(9);
    });

    it('is not null with organizations only', () => {
      expect(v2([], orgs, [])).toEqual({
        result_id: 41,
        phase_year: 2025,
        total_actors: 0,
        total_organizations: 9,
        measures: [],
      });
    });

    it('is null when actors, organizations and measures are all empty', () => {
      expect(v2([], [orgs[1], orgs[3]], [measures[3]])).toBeNull();
    });
  });
});
