import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/**
 * P2-2932 — comparing the contribution a user typed against a ToC indicator target with what the
 * result's own type-specific data implies.
 *
 * **It is a comparison, not an auto-population.** The ticket's description says the system
 * "automatically populates" the value; the PO settled otherwise on 1-Sep-2026: read what the user
 * already entered, look for something equivalent in the type-specific section, and *show the
 * comparison* — "si hay correspondencia, se compara; si no hay nada con qué comparar, simplemente
 * no se compara y se deja así". The ticket's own title asks for cross-section *consistency*, so
 * this resolves a contradiction that was in the ticket from the start.
 *
 * Two consequences follow, and both remove risk this ticket used to carry:
 *
 * - **Nothing is written, so no number moves.** `contributing_indicator` feeds live progress
 *   reporting on six surfaces (RFR AoW/HLO progress, the Excel export, ToC enrichment, and more).
 *   A comparison can be shown over already-reported results without changing a single percentage.
 * - **The multiplicity problem stops being dangerous.** A result mapped to several ToC indicators
 *   has one box per mapping and the aggregate SUMs them; writing a derived value into each would
 *   have multiplied the achievement. Reading them cannot.
 *
 * ⚠️ NOTHING CALLS THIS YET. Two points are still open with the PO: the definition of the Capacity
 * Development total (below), and which figure an Innovation Use actor row compares against. Until
 * those land this stays pure functions with no persistence and no wiring.
 *
 * The field is `result_indicators_targets.contributing_indicator`. It is labelled four different
 * things across the product — "Contribution to indicator target", "Enter target", "Contribution",
 * "Achieved value" — and "Achieved Yearly Value", the name in the ticket, appears nowhere in the
 * codebase. Audit: `docs/specs/results/p2-2932-achieved-yearly-value/requirement-audit.md`.
 */

/**
 * Why a type has nothing to compare against.
 *
 * Per the PO: when the type-specific section holds no equivalent figure, the comparison is simply
 * not shown. Silence is the correct outcome, not a warning and not an invented number.
 */
export type NotDerivableReason =
  /** Policy Change: no contribution-type selector and no "actors influenced" field exist. */
  | 'NO_CONTRIBUTION_TYPE_SELECTOR'
  /** Innovation Use: both candidate figures are repeatable lists; which one to read is undecided. */
  | 'NO_REPORTING_OPTION_SELECTOR'
  /** The ticket gives this result type no rule at all. */
  | 'NO_RULE_FOR_TYPE';

export type DerivedAchievedValue =
  | { derivable: true; value: number }
  | { derivable: false; reason: NotDerivableReason };

/** The four head-count columns on `results_capacity_developments`. There is no total column. */
export interface CapacityDevelopmentCounts {
  female_using?: number | string | null;
  male_using?: number | string | null;
  non_binary_using?: number | string | null;
  has_unkown_using?: number | string | null;
}

/**
 * A single reported result is one knowledge product and one innovation, so both types derive to a
 * literal 1.
 *
 * The ticket also wants the user to be able to set 0 for a knowledge product that "serves as an
 * enabler". **That case cannot be derived**: no `enabler` flag exists on the KP entity, and nothing
 * else in the data says a KP should not count. The 2026 tooltip already asks the user to type the 0
 * by hand, so whatever consumes this must leave the field editable rather than force the 1.
 */
const ONE_PER_RESULT = 1;

/**
 * The "Total Number of People Trained" the ticket names does not exist as a column — there are four
 * independent counts and nothing sums them anywhere in the product.
 *
 * `has_unkown_using` is included: those are people who were trained, only without a recorded
 * gender. Excluding them would under-report the result and make the derived value disagree with
 * what the four boxes visibly add up to. Pending explicit confirmation from the PO.
 *
 * Null and empty are treated as zero rather than as "unknown": the four inputs are optional and a
 * result with only two of them filled must still derive a usable total.
 */
export function deriveCapacityDevelopmentTotal(
  counts: CapacityDevelopmentCounts | null | undefined,
): number {
  const read = (raw: number | string | null | undefined): number => {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  return (
    read(counts?.female_using) +
    read(counts?.male_using) +
    read(counts?.non_binary_using) +
    read(counts?.has_unkown_using)
  );
}

export interface DerivationInput {
  resultTypeId: number;
  capacityDevelopment?: CapacityDevelopmentCounts | null;
}

/**
 * The value the result's own data implies for one ToC indicator target.
 *
 * 🛑 The two undecided types return `derivable: false` rather than a guess. Policy Change needs a
 * three-way contribution-type selector that does not exist, and has no "actors influenced" field at
 * all; Innovation Use needs a reporting-option toggle that does not exist, and stores both of its
 * candidate figures as repeatable lists rather than single values. Inventing a number for either
 * would put a fabricated figure into live progress reporting.
 */
export function deriveAchievedValue(
  input: DerivationInput,
): DerivedAchievedValue {
  switch (Number(input?.resultTypeId)) {
    case ResultTypeEnum.KNOWLEDGE_PRODUCT:
    case ResultTypeEnum.INNOVATION_DEVELOPMENT:
      return { derivable: true, value: ONE_PER_RESULT };

    case ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
      return {
        derivable: true,
        value: deriveCapacityDevelopmentTotal(input.capacityDevelopment),
      };

    case ResultTypeEnum.POLICY_CHANGE:
      return { derivable: false, reason: 'NO_CONTRIBUTION_TYPE_SELECTOR' };

    case ResultTypeEnum.INNOVATION_USE:
      return { derivable: false, reason: 'NO_REPORTING_OPTION_SELECTOR' };

    default:
      // Every other type — Other outcome, Other output, Impact contribution, IPSR types — has no
      // rule in the ticket. Silence is correct here: they keep the manual field they have today.
      return { derivable: false, reason: 'NO_RULE_FOR_TYPE' };
  }
}

/**
 * The outcome of comparing one contribution box against the result's own data.
 *
 * Four outcomes, not a boolean, because a boolean gets one case wrong. The 2026 tooltip explicitly
 * tells the user to enter **0** for a knowledge product that does not count independently toward
 * the yearly target. That 0 differs from the expected 1, so a boolean would flag it — a warning
 * fired at someone for following the instruction printed under the field.
 */
export type ComparisonStatus =
  /** The typed value equals what the data implies. */
  | 'MATCH'
  /** The typed value disagrees. This is the only status that warrants showing anything. */
  | 'DIFFERS'
  /** It disagrees, but the product documents this exact deviation as legitimate. */
  | 'ALLOWED_EXCEPTION'
  /** Nothing to compare — the type has no rule, or the user has not typed anything yet. */
  | 'NOTHING_TO_COMPARE';

export interface ComparisonResult {
  status: ComparisonStatus;
  /** What the result's own data implies. Null when nothing could be derived. */
  expected: number | null;
  /** What the user typed. Null when the box is empty. */
  reported: number | null;
}

const nothingToCompare = (expected: number | null): ComparisonResult => ({
  status: 'NOTHING_TO_COMPARE',
  expected,
  reported: null,
});

/**
 * Compare what the user typed in the ToC section against what their own type-specific data implies.
 *
 * This is the whole ticket, per the PO's ruling: *"tomar el valor ingresado en el campo de
 * contribution target y verificar si hay algo con qué compararlo… Si hay correspondencia, se
 * compara; si no hay nada con qué comparar, simplemente no se compara y se deja así."*
 *
 * Nothing is written. The caller decides how to surface a `DIFFERS`, and must not turn it into a
 * block: the user may have a reason the data cannot express, and the field stays theirs.
 */
export function compareWithReportedData(
  input: DerivationInput,
  contributingIndicator: number | string | null | undefined,
): ComparisonResult {
  const derived = deriveAchievedValue(input);
  if (!derived.derivable) return nothingToCompare(null);

  // An untouched box is not a disagreement. `Number(null)` and `Number('')` are both 0, which is
  // finite, so a `Number.isFinite` guard alone would report every empty input as differing from
  // any non-zero expectation — a warning on every result nobody has filled in yet.
  if (
    contributingIndicator === null ||
    contributingIndicator === undefined ||
    String(contributingIndicator).trim() === ''
  ) {
    return nothingToCompare(derived.value);
  }

  const reported = Number(contributingIndicator);
  if (!Number.isFinite(reported)) return nothingToCompare(derived.value);

  if (reported === derived.value) {
    return { status: 'MATCH', expected: derived.value, reported };
  }

  if (isDocumentedException(input, reported)) {
    return { status: 'ALLOWED_EXCEPTION', expected: derived.value, reported };
  }

  return { status: 'DIFFERS', expected: derived.value, reported };
}

/**
 * A deviation the product itself asks for. Only one exists today.
 *
 * The 2026 tooltip, verbatim: *"If the KP does not count independently toward the yearly target —
 * for example, because it serves as a complementary result supporting the achievement of another
 * result that carries the count — enter 0."* Nothing in the data distinguishes that KP from one
 * where the user simply typed the wrong number, so the 0 is accepted rather than questioned.
 *
 * Innovation Development is included: the ticket gives it "the same logic as Knowledge Products".
 */
function isDocumentedException(
  input: DerivationInput,
  reported: number,
): boolean {
  const type = Number(input?.resultTypeId);
  const isOnePerResult =
    type === ResultTypeEnum.KNOWLEDGE_PRODUCT ||
    type === ResultTypeEnum.INNOVATION_DEVELOPMENT;

  return isOnePerResult && reported === 0;
}

/** Convenience for callers that only need to know whether to show something. */
export function shouldShowComparison(result: ComparisonResult): boolean {
  return result.status === 'DIFFERS';
}
