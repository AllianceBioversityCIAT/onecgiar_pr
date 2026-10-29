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

    const fromV2 = await v2.getPreviousPhaseCurrentUse(41, 2025);
    const fromUtil = summarizePreviousPhaseCurrentUse(rawRows(), 41, 2025);

    expect(fromUtil).toEqual({
      result_id: 41,
      phase_year: 2025,
      total_actors: 505,
    });
    expect(fromV2.total_actors).toBe(fromUtil.total_actors);
    expect(fromV2.phase_year).toBe(fromUtil.phase_year);
  });
});
