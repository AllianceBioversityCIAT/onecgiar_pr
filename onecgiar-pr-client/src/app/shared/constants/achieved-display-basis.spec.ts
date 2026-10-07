// ── ACS-TEST-1 (docs/specs/bugfix/achieved-counts-submitted, ACS-T-1) ────────────────────────
//
// `achieved-display-basis.ts` does NOT exist yet — that is T-3's job. This import failing
// (module not found) IS the expected red for this file: the Implementer's job, per the Leader's
// brief, is to pin the API the normaliser must expose before it exists.
//
// Seam this file assumes (state clearly for T-3, per the brief):
//   export const SHOW_QA_PREL_SPLIT: boolean;               // false by default (ACS-R-5, ACS-S-10)
//   export function toDisplayBasis<T>(payload: T, showSplit = SHOW_QA_PREL_SPLIT): T;
// The second, OPTIONAL parameter is the testable seam for the switch (ACS-S-10): the
// `ResultsApiService` call sites will call `toDisplayBasis(payload)` (switch read from the
// exported constant), while this suite can flip it per-case via the explicit second argument
// without touching module-level state between tests.
import { SHOW_QA_PREL_SPLIT, toDisplayBasis } from './achieved-display-basis';
import {
  partitionProgramKpis,
  summarisePartition,
} from '../../pages/result-framework-reporting/pages/dashboard-lab/reporting-burndown';

describe('achieved-display-basis', () => {
  describe('toDisplayBasis — indicator re-pointing (ACS-DD-2, switch off / default)', () => {
    it('re-points actual_achieved_value_sum and progress_percentage to the achieved/union basis, keeping the QA value under qa_actual_achieved_value_sum', () => {
      // design.md §8.1: indicator `actual_achieved_value_sum ← achieved_value_sum`,
      // `progress_percentage ← achieved_progress_percentage`; original QA value kept as qa_*.
      const payload = {
        tocResults: [
          {
            toc_result_id: 1,
            indicators: [
              {
                indicator_id: 10,
                actual_achieved_value_sum: 0,
                achieved_value_sum: 1,
                progress_percentage: '0%',
                achieved_progress_percentage: '100%',
              },
            ],
          },
        ],
      };

      const result = toDisplayBasis(payload, false) as any;
      const indicator = result.tocResults[0].indicators[0];

      expect(indicator.actual_achieved_value_sum).toBe(1);
      expect(indicator.progress_percentage).toBe('100%');
      expect(indicator.qa_actual_achieved_value_sum).toBe(0);
    });

    // ACS-S-2: counted exactly once across a status move, and Approved (which today sits in both
    // the QA and Prel sets) must never be double-read as 2 once displayed on the single figure.
    it('reads 1, never 2, for both an Approved-only fixture and a Submitted-to-QualityAssessed transition fixture', () => {
      const approvedOnly = {
        tocResults: [
          {
            indicators: [
              {
                indicator_id: 20,
                actual_achieved_value_sum: 1,
                achieved_value_sum: 1,
                progress_percentage: '100%',
                achieved_progress_percentage: '100%',
              },
            ],
          },
        ],
      };
      // Same contribution, now QualityAssessed: the QA-basis field has caught up to the
      // already-correct union figure — must still read 1, not 2.
      const submittedThenQualityAssessed = {
        tocResults: [
          {
            indicators: [
              {
                indicator_id: 21,
                actual_achieved_value_sum: 1,
                achieved_value_sum: 1,
                progress_percentage: '100%',
                achieved_progress_percentage: '100%',
              },
            ],
          },
        ],
      };

      const approvedResult = toDisplayBasis(approvedOnly, false) as any;
      const transitionResult = toDisplayBasis(
        submittedThenQualityAssessed,
        false,
      ) as any;

      expect(
        approvedResult.tocResults[0].indicators[0].actual_achieved_value_sum,
      ).toBe(1);
      expect(
        transitionResult.tocResults[0].indicators[0].actual_achieved_value_sum,
      ).toBe(1);
    });
  });

  describe('toDisplayBasis — guard: unconditional only when the union field is present (ACS-DD-5)', () => {
    it('returns the payload unchanged when achieved_value_sum / achieved_progress_percentage are absent (old server, deploy-order safety)', () => {
      const payload = {
        tocResults: [
          {
            indicators: [
              {
                indicator_id: 30,
                actual_achieved_value_sum: 5,
                progress_percentage: '50%',
              },
            ],
          },
        ],
      };

      const result = toDisplayBasis(payload, false) as any;

      expect(result.tocResults[0].indicators[0]).toEqual({
        indicator_id: 30,
        actual_achieved_value_sum: 5,
        progress_percentage: '50%',
      });
    });
  });

  describe('toDisplayBasis — switch on is identity (ACS-S-10)', () => {
    it('returns the payload unchanged (no re-pointing) when the split switch is on', () => {
      const payload = {
        tocResults: [
          {
            indicators: [
              {
                indicator_id: 40,
                actual_achieved_value_sum: 0,
                achieved_value_sum: 1,
                progress_percentage: '0%',
                achieved_progress_percentage: '100%',
              },
            ],
          },
        ],
      };

      const result = toDisplayBasis(payload, true);

      expect(result).toEqual(payload);
    });

    it('SHOW_QA_PREL_SPLIT defaults to false (ACS-R-5)', () => {
      expect(SHOW_QA_PREL_SPLIT).toBe(false);
    });
  });

  // ── ACS-TEST-1 (ACS-S-8) — Overview "Progress by area of work" / "KPIs with evidence" ────────
  //
  // reporting-burndown.ts must NOT change (Leader ruling, ACS-DD-1/ACS-DD-2: the normaliser is the
  // ONE choke point). So this proves the requirement end-to-end through the normaliser instead:
  // the raw AoW payload shape the API returns -> toDisplayBasis -> partitionProgramKpis ->
  // summarisePartition. A Submitted-not-yet-QA'd KPI (target 1, QA-basis actual 0, union
  // achieved_value_sum 1) must count as reported once normalised (ACS-S-1/ACS-S-8). A sibling
  // zero-target KPI (target 0, achieved 0) rides along in the same fixture to pin the
  // kpi-count-reconciliation (KCR-R-2) rule unchanged: every planned KPI — including a zero-target
  // one — stays in the denominator (`counted`), and `zeroTarget` stays 0 by design
  // (`applyZeroTargetRule`'s own docstring: "zeroTarget is always 0 — kept in the return shape so
  // existing callers compile"); the zero-target KPI is simply never read as reported because its
  // achieved value is 0, not because it is excluded from counting.
  // ── ACS-T-3 forward pointers from the T-1 Reviewer (ADVISORY 1) ──────────────────────────────
  //
  // design.md §8.1 walks FIVE roll-up shapes (top-level `progress`, `areas[].progress`, and each
  // node's own `progress` inside `tocResults[]` / `tocResultsOutputs[]` / `tocResultsOutcomes[]`),
  // on top of the indicator re-point already proven above. Real shapes confirmed at source
  // (`results-framework-reporting.service.ts`, `aow-bilateral.repository.ts`):
  //   - GET_TocResultsByAowId      -> { progress, tocResultsOutputs[], tocResultsOutcomes[] }
  //   - GET_IntermediateOutcomes   -> { tocResults[] }            (no top-level progress)
  //   - GET_2030Outcomes           -> { tocResults[] }            (no top-level progress)
  //   - GET_ScienceProgramTocProgress -> { progress, areas[].progress }
  // Every node in every one of those arrays carries its own `progress`
  // (`aow-bilateral.repository.ts`: `node.progress = rollUpIndicators(node.indicators)`), which
  // matches design §8.1's claim.
  describe('toDisplayBasis — roll-up re-pointing (ACS-DD-2, every shape design §8.1 walks)', () => {
    const rollupFixture = () => ({
      progress_value: 0,
      achieved_value: 100,
      progress_percentage: '0%',
      achieved_progress_percentage: '100%'
    });

    it('re-points a top-level progress roll-up (GET_TocResultsByAowId / GET_ScienceProgramTocProgress shape)', () => {
      const payload = { progress: rollupFixture() };

      const result = toDisplayBasis(payload, false) as any;

      expect(result.progress.progress_value).toBe(100);
      expect(result.progress.progress_percentage).toBe('100%');
      expect(result.progress.qa_progress_value).toBe(0);
      expect(result.progress.qa_progress_percentage).toBe('0%');
    });

    it('re-points areas[].progress (GET_ScienceProgramTocProgress shape)', () => {
      const payload = {
        progress: rollupFixture(),
        areas: [{ code: 'AOW01', name: 'Area of Work 1', progress: rollupFixture() }]
      };

      const result = toDisplayBasis(payload, false) as any;

      expect(result.areas[0].progress.progress_value).toBe(100);
      expect(result.areas[0].progress.progress_percentage).toBe('100%');
      // the program-level figure above is re-pointed independently of the area's own
      expect(result.progress.progress_value).toBe(100);
    });

    it.each(['tocResults', 'tocResultsOutputs', 'tocResultsOutcomes'] as const)(
      "re-points a node's own progress roll-up inside %s[]",
      key => {
        const payload = {
          [key]: [{ toc_result_id: 1, progress: rollupFixture(), indicators: [] }]
        };

        const result = toDisplayBasis(payload, false) as any;

        expect(result[key][0].progress.progress_value).toBe(100);
        expect(result[key][0].progress.progress_percentage).toBe('100%');
        expect(result[key][0].progress.qa_progress_value).toBe(0);
      }
    );

    it.each(['tocResultsOutputs', 'tocResultsOutcomes'] as const)(
      're-points an indicator inside %s[] the same way as tocResults[] (GET_TocResultsByAowId shape)',
      key => {
        const payload = {
          [key]: [
            {
              toc_result_id: 1,
              indicators: [
                {
                  indicator_id: 1,
                  actual_achieved_value_sum: 0,
                  achieved_value_sum: 1,
                  progress_percentage: '0%',
                  achieved_progress_percentage: '100%'
                }
              ]
            }
          ]
        };

        const result = toDisplayBasis(payload, false) as any;

        expect(result[key][0].indicators[0].actual_achieved_value_sum).toBe(1);
        expect(result[key][0].indicators[0].progress_percentage).toBe('100%');
      }
    );
  });

  // ── ACS-T-3 forward pointer (ADVISORY 2) — no mutation ────────────────────────────────────────
  describe('toDisplayBasis — does not mutate the original payload (T-3 BUT clause)', () => {
    it('leaves every original value in place after normalising (indicator + every roll-up shape)', () => {
      const payload = {
        progress: {
          progress_value: 0,
          achieved_value: 100,
          progress_percentage: '0%',
          achieved_progress_percentage: '100%'
        },
        areas: [
          {
            code: 'AOW01',
            progress: {
              progress_value: 0,
              achieved_value: 100,
              progress_percentage: '0%',
              achieved_progress_percentage: '100%'
            }
          }
        ],
        tocResults: [
          {
            toc_result_id: 1,
            progress: {
              progress_value: 0,
              achieved_value: 100,
              progress_percentage: '0%',
              achieved_progress_percentage: '100%'
            },
            indicators: [
              {
                indicator_id: 1,
                actual_achieved_value_sum: 0,
                achieved_value_sum: 1,
                progress_percentage: '0%',
                achieved_progress_percentage: '100%'
              }
            ]
          }
        ]
      };
      const snapshot = JSON.parse(JSON.stringify(payload));

      const result = toDisplayBasis(payload, false);

      // the normalised output changed...
      expect(result).not.toBe(payload);
      // ...but the input object graph the caller still holds a reference to did not.
      expect(payload).toEqual(snapshot);
      expect(payload.progress.progress_value).toBe(0);
      expect(payload.areas[0].progress.progress_value).toBe(0);
      expect(payload.tocResults[0].progress.progress_value).toBe(0);
      expect(payload.tocResults[0].indicators[0].actual_achieved_value_sum).toBe(0);
    });
  });

  // ── ACS-T-3 forward pointer (ADVISORY 4) — per-field guard, independently per field ──────────
  describe('toDisplayBasis — per-field guard (ACS-DD-5): only the field whose union counterpart exists is re-pointed', () => {
    it('re-points the indicator value but leaves the percentage alone when only achieved_value_sum is present', () => {
      const payload = {
        tocResults: [
          {
            indicators: [
              {
                indicator_id: 50,
                actual_achieved_value_sum: 2,
                achieved_value_sum: 9,
                // achieved_progress_percentage intentionally absent
                progress_percentage: '20%'
              }
            ]
          }
        ]
      };

      const result = toDisplayBasis(payload, false) as any;
      const indicator = result.tocResults[0].indicators[0];

      expect(indicator.actual_achieved_value_sum).toBe(9);
      expect(indicator.qa_actual_achieved_value_sum).toBe(2);
      expect(indicator.progress_percentage).toBe('20%');
      expect(indicator.qa_progress_percentage).toBeUndefined();
    });

    it('re-points the roll-up percentage but leaves the value alone when only achieved_progress_percentage is present', () => {
      const payload = {
        progress: {
          progress_value: 2,
          progress_percentage: '20%',
          achieved_progress_percentage: '90%'
          // achieved_value intentionally absent
        }
      };

      const result = toDisplayBasis(payload, false) as any;

      expect(result.progress.progress_percentage).toBe('90%');
      expect(result.progress.qa_progress_percentage).toBe('20%');
      expect(result.progress.progress_value).toBe(2);
      expect(result.progress.qa_progress_value).toBeUndefined();
    });
  });

  describe('toDisplayBasis feeding partitionProgramKpis/summarisePartition — ACS-S-8', () => {
    it('counts the submitted-only KPI as reported (1, not 0) once normalised, while the zero-target sibling stays counted but unreported (KCR-R-2)', () => {
      const payload = {
        tocResults: [
          {
            toc_result_id: 1,
            indicators: [
              {
                indicator_id: 'kp-31037',
                target_value_sum: 1,
                actual_achieved_value_sum: 0,
                achieved_value_sum: 1,
                progress_percentage: '0%',
                achieved_progress_percentage: '100%',
              },
              {
                indicator_id: 'kp-zero',
                target_value_sum: 0,
                actual_achieved_value_sum: 0,
                achieved_value_sum: 0,
                progress_percentage: '0%',
                achieved_progress_percentage: '0%',
              },
            ],
          },
        ],
      };

      // Fails today purely on module resolution (toDisplayBasis doesn't exist) — once it exists,
      // this pins that its output, fed into the existing (unmodified) summarisePartition, already
      // reads the submitted-only KPI as reported with zero changes to reporting-burndown.ts.
      const normalised = toDisplayBasis(payload, false) as any;
      const indicators = normalised.tocResults[0].indicators;

      const partition = partitionProgramKpis(
        [{ aow: { code: 'A' }, indicators }],
        null,
        null,
      );

      expect(summarisePartition(partition)).toEqual({
        planned: 2,
        zeroTarget: 0,
        counted: 2,
        reported: 1,
      });
    });
  });
});
