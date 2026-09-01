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

/**
 * One row of the actors list on an Innovation Use result (`result_actors`).
 *
 * `how_many` is the row's total and the ONLY figure to read. It is filled two ways and both end up
 * as the total: typed directly when "sex and age disaggregation does not apply", or computed as
 * `women + men` when it does (`step-n3-current-use.component.ts:113`).
 *
 * 🛑 Never sum the four gender columns instead. Youth is a SUBSET of women/men, not a fifth
 * category — the form enforces it ("the value of Youth cannot be greater than total of Women") and
 * `women_non_youth` is read-only. Adding them would double-count every young person.
 */
export interface InnovationUseActor {
  how_many?: number | string | null;
}

/**
 * The number of people an Innovation Use result reports, across every actor row.
 *
 * The sum, not one row: the PO's rule is that figures across boxes add up rather than repeat
 * ("si en uno se indica 120 y en otro 80, el resultado impactó a 200 personas"), and the same
 * arithmetic has to hold on this side or the two totals could never meet. His own example carried
 * a single actor row, where the sum and the row are the same number.
 */
export function deriveInnovationUseTotal(
  actors: readonly InnovationUseActor[] | null | undefined,
): number {
  const rows = Array.isArray(actors) ? actors : [];

  return rows.reduce((total, actor) => {
    const value = Number(actor?.how_many);
    return total + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);
}

export interface DerivationInput {
  /**
   * The type the RESULT was created as — not the type of the ToC indicator being compared.
   *
   * The PO's rule for mixed results: "se debe priorizar el tipo con el que fue creado el resultado.
   * La razón es que la Sección 4 contiene únicamente la información correspondiente al tipo
   * original". A Capacity Sharing result that later picks up an Innovation Development indicator
   * still compares as Capacity Sharing, because that is the only data its type-specific section
   * holds.
   */
  resultTypeId: number;
  capacityDevelopment?: CapacityDevelopmentCounts | null;
  innovationUseActors?: readonly InnovationUseActor[] | null;
}

/**
 * The total the result's own type-specific section implies, against which the ToC contribution is
 * compared.
 *
 * Keyed on the result's ORIGINAL type — see `DerivationInput.resultTypeId`. An indicator of some
 * other type has no counterpart in the type-specific section and simply does not get compared.
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

    case ResultTypeEnum.INNOVATION_USE:
      return {
        derivable: true,
        value: deriveInnovationUseTotal(input.innovationUseActors),
      };

    // Still undecided, and deliberately so. The rule needs a three-way contribution-type selector
    // that does not exist in the form, and an "actors influenced" field that does not exist at all.
    // Inventing a number here would put a fabricated figure in front of a reporter.
    case ResultTypeEnum.POLICY_CHANGE:
      return { derivable: false, reason: 'NO_CONTRIBUTION_TYPE_SELECTOR' };

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

/**
 * One ToC contribution box, as the user filled it in.
 *
 * `indicatorResultTypeId` is the type of the *indicator*, which is not necessarily the type of the
 * result: nothing in the product restricts the indicator picker to the result's own type — it
 * filters by LEVEL only (`multiple-wps-content.component.ts:265-281`), and the picker even shows an
 * "Indicator category" column, so mixed selections are expected rather than exceptional.
 */
export interface ContributionBox {
  contributingIndicator: number | string | null | undefined;
  indicatorResultTypeId?: number | null;
}

export interface ResultComparison extends ComparisonResult {
  /** Boxes that were compared — those matching the result's original type and actually filled in. */
  boxesCounted: number;
  /** Boxes present on the result, including the ones excluded below. */
  boxesTotal: number;
  /**
   * Boxes skipped because their indicator is of a different type than the result. The
   * type-specific section holds nothing to compare them against, so they are left out rather than
   * counted as a disagreement.
   */
  boxesOfAnotherType: number;
}

/**
 * Compare a result as a whole: the SUM of its contribution boxes against the total its own
 * type-specific section implies.
 *
 * The sum, not box by box. The PO's rule: "los valores de cada casilla no se reparten ni se
 * duplican… si en uno se indica que se capacitaron 120 personas y en otro 80, esto significa que el
 * resultado impactó a 200 personas en total. Ese total debería coincidir con lo que se registra en
 * la sección". Comparing each box against the full total would flag every result mapped to more
 * than one indicator.
 *
 * Boxes whose indicator is of another type are excluded first, per the same ruling. If that leaves
 * nothing filled in, there is nothing to compare and the result is silent.
 */
export function compareResultTotal(
  input: DerivationInput,
  boxes: readonly ContributionBox[] | null | undefined,
): ResultComparison {
  const all = Array.isArray(boxes) ? boxes : [];
  const ownType = Number(input?.resultTypeId);

  const sameType = all.filter(
    (box) =>
      box?.indicatorResultTypeId === null ||
      box?.indicatorResultTypeId === undefined ||
      Number(box.indicatorResultTypeId) === ownType,
  );

  const filled = sameType.filter(
    (box) =>
      box?.contributingIndicator !== null &&
      box?.contributingIndicator !== undefined &&
      String(box.contributingIndicator).trim() !== '' &&
      Number.isFinite(Number(box.contributingIndicator)),
  );

  const counts = {
    boxesCounted: filled.length,
    boxesTotal: all.length,
    boxesOfAnotherType: all.length - sameType.length,
  };

  if (filled.length === 0) {
    return { ...compareWithReportedData(input, null), ...counts };
  }

  const reportedTotal = filled.reduce(
    (sum, box) => sum + Number(box.contributingIndicator),
    0,
  );

  return { ...compareWithReportedData(input, reportedTotal), ...counts };
}

/** Convenience for callers that only need to know whether to show something. */
export function shouldShowComparison(result: ComparisonResult): boolean {
  return result.status === 'DIFFERS';
}
