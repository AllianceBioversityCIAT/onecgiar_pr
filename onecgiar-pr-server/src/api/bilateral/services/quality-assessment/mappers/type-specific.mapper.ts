// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4, amended v0.2 BIL-QAI-T-4b)
import { ResultTypeEnum } from '../../../../../shared/constants/result-type.enum';
import {
  POLICY_CHANGE_FIELD_LABELS,
  INNOVATION_USE_FIELD_LABELS,
  CAPACITY_SHARING_FIELD_LABELS,
  INNOVATION_DEVELOPMENT_FIELD_LABELS,
} from '../field-labels';

/**
 * `sections.type_specific` — one dispatcher per `ResultTypeEnum`, each returning
 * `{ type, fields }`.
 *
 * v0.2 (`design.md` §4.5, §5 "Payload builder — v0.2 amendments"; `docs/bilateral-module/
 * integration-contracts.md` → "Type-specific fields") replaces v0.1's flat, hand-written
 * labelled fields with a **fixed per-type set of frozen labels** (see `../field-labels.ts`)
 * whose values are **typed objects** — counts, amounts and disaggregations are never sent as
 * prose. Knowledge product stays unchanged (still built for the content hash; never sent to
 * the AI — `BIL-QAI-R-9`). Other output / Other outcome send `fields: {}`.
 *
 * Sources, per type:
 * - Policy change / Capacity sharing: `detail.policy_change_summary` /
 *   `detail.capacity_development_summary` — `BilateralService`'s own enriched bilateral
 *   summaries (`buildPolicyChangeBilateralSummary` / `buildCapacityDevelopmentBilateralSummary`,
 *   `bilateral.service.ts`), each unconditionally shaped with every key present (never a bare
 *   `{}`) even when the underlying row is missing, so the mandatory labels below are always
 *   present under `null` / `[]` rather than dropped.
 * - Innovation use: `formDetail.resultTypeResponse[0]` (`{ actors, measures, ... }` —
 *   `ResultsService._loadBilateralResultTypeData` → `InnovationUseService
 *   .getBilateralInnovationUseData`) for actors/measures, plus `detail.innovation_use_summary`
 *   for the three budget arrays (`initiative_budget`, `bilateral_project_budget`,
 *   `partner_budget` — all three spread in by `BilateralService
 *   .buildInnovationSharedBudgetAndEvidenceExtras`, `bilateral.service.ts:2225-2323`).
 * - Innovation development: `formDetail.resultTypeResponse[0]`
 *   (`ResultRepository.getInnovationDevBilateralResultById`), unchanged shape from v0.1 minus
 *   the extra `"Contributing project"` key the contract's frozen 3-label set does not include.
 */

const RESULT_TYPE_API_STRING: Partial<Record<ResultTypeEnum, string>> = {
  [ResultTypeEnum.POLICY_CHANGE]: 'policy_change',
  [ResultTypeEnum.INNOVATION_USE]: 'innovation_use',
  [ResultTypeEnum.OTHER_OUTCOME]: 'other_outcome',
  [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
  [ResultTypeEnum.KNOWLEDGE_PRODUCT]: 'knowledge_product',
  [ResultTypeEnum.INNOVATION_DEVELOPMENT]: 'innovation_development',
  [ResultTypeEnum.OTHER_OUTPUT]: 'other_output',
  [ResultTypeEnum.INNOVATION_USE_IPSR]: 'innovation_package',
};

/** Catalog seed `('Farmers/...'), ('Researchers'), ('Extension agents'), ('Policy actors...'), ('Other')` — id 5 is the free-text actor type (`src/migrations/1679588387039-insertActorsType.ts`); the same id is used as the "Other" discriminator across `results-innovation-packages-validation-module.repository.ts` and the IPSR pathway services. */
const OTHER_ACTOR_TYPE_ID = 5;

/** `capdevs_term.term` seed values only — never invent a third (`src/migrations/1668784095214-addCapDevMethodsAndTerm.ts`, `.../1668806452093-migrationCaptDev.ts`). */
const TRAINING_LENGTH_VALUES = ['Long-term', 'Short-term'] as const;
type TrainingLength = (typeof TRAINING_LENGTH_VALUES)[number];

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function firstRow(response: unknown): any | null {
  return Array.isArray(response) && response.length > 0 ? response[0] : null;
}

function mapKnowledgeProduct(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const kp = firstRow(formDetail?.resultTypeResponse);
  const fields: Record<string, unknown> = {};

  if (kp) {
    fields['Knowledge product type'] = kp.knowledge_product_type ?? null;
    fields['Licence'] = kp.licence ?? null;
    fields['Keywords'] = (Array.isArray(kp.keywords) ? kp.keywords : [])
      .map((k: any) => k?.keyword)
      .filter((k: unknown): k is string => !!k);

    for (const meta of Array.isArray(kp.metadata) ? kp.metadata : []) {
      const source = meta?.source ? String(meta.source) : 'Metadata';
      fields[`${source} year`] = numberOrNull(meta?.year);
      fields[`${source} peer reviewed`] = !!meta?.is_peer_reviewed;
      fields[`${source} ISI`] = !!meta?.is_isi;
      fields[`${source} accessibility`] = meta?.accesibility ?? null;
    }
  } else {
    // Fallback: findOne's bilateral summary only ever exposes the public handle.
    fields['Handle'] = detail?.knowledge_product_summary?.handle ?? null;
  }

  return fields;
}

/**
 * `"Length of training"` — a single value per result, never a per-person split (design.md §4.5
 * "Notes the AI side depends on"). `training_length.term` already IS the frozen literal
 * (`Long-term` | `Short-term`) straight off `capdevs_term.term`; this only guards against a
 * catalogue row this mapper does not know about rather than "translating" anything.
 */
function mapTrainingLength(term: unknown): TrainingLength | null {
  return typeof term === 'string' &&
    (TRAINING_LENGTH_VALUES as readonly string[]).includes(term)
    ? (term as TrainingLength)
    : null;
}

function mapImplementingOrganizationNames(rows: unknown): string[] {
  return (Array.isArray(rows) ? rows : [])
    .map((org: any) => org?.name || org?.acronym)
    .filter((name: unknown): name is string => !!name);
}

function mapCapacitySharing(
  detail: Record<string, any>,
): Record<string, unknown> {
  const summary = detail?.capacity_development_summary ?? {};

  const female = numberOrZero(summary?.female_using);
  const male = numberOrZero(summary?.male_using);
  const nonBinary = numberOrZero(summary?.non_binary_using);
  const unknown = numberOrZero(summary?.has_unkown_using);

  return {
    [CAPACITY_SHARING_FIELD_LABELS.NUMBER_OF_PEOPLE_TRAINED]: {
      total: female + male + nonBinary + unknown,
      female,
      male,
      non_binary: nonBinary,
      unknown,
    },
    [CAPACITY_SHARING_FIELD_LABELS.LENGTH_OF_TRAINING]: mapTrainingLength(
      summary?.training_length?.term,
    ),
    [CAPACITY_SHARING_FIELD_LABELS.DELIVERY_METHOD]:
      summary?.delivery_method?.name ?? null,
    [CAPACITY_SHARING_FIELD_LABELS.IMPLEMENTING_ORGANIZATIONS]:
      mapImplementingOrganizationNames(summary?.on_behalf_organizations),
  };
}

function mapInnovationDevelopment(
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const row = firstRow(formDetail?.resultTypeResponse);

  const level = numberOrNull(row?.level);
  const levelName = row?.name ?? null;
  const readinessLevel =
    level != null
      ? `Level ${level}${levelName ? ` — ${levelName}` : ''}`
      : (levelName ?? null);

  return {
    [INNOVATION_DEVELOPMENT_FIELD_LABELS.INNOVATION_TYPOLOGY]:
      row?.innovation_type_name ?? null,
    [INNOVATION_DEVELOPMENT_FIELD_LABELS.READINESS_LEVEL]: readinessLevel,
    // Verbatim or null — NEVER fall back to the lead contact person (`BIL-QAI-R-15`; the
    // silent-overwrite fallback lives in the form/ingest handler and is removed by `T-12`).
    [INNOVATION_DEVELOPMENT_FIELD_LABELS.INNOVATION_DEVELOPERS]:
      row?.innovation_developers ?? null,
  };
}

/**
 * `"Other: <text>"` for the free-text actor type (id {@link OTHER_ACTOR_TYPE_ID}) when the
 * reporter actually entered free text; the catalogue name (`"Other"`, per the seed row cited on
 * {@link OTHER_ACTOR_TYPE_ID}) otherwise — a row saved with `actor_type_id === 5` and no
 * `other_actor_type` must never emit the empty `"Other: "` label. `obj_actor_type` is the
 * `ActorType` relation `getActorsData` / `getBilateralInnovationUseData` load
 * (`innovation-use.service.ts:901-936,1128-1163`).
 */
function mapActorTypeLabel(actor: Record<string, any>): string | null {
  const typeId = Number(actor?.actor_type_id);
  if (typeId === OTHER_ACTOR_TYPE_ID) {
    const otherText =
      typeof actor?.other_actor_type === 'string'
        ? actor.other_actor_type.trim()
        : '';
    if (otherText) {
      return `Other: ${otherText}`;
    }
    return actor?.obj_actor_type?.name ?? actor?.actor_type?.name ?? 'Other';
  }
  return actor?.obj_actor_type?.name ?? actor?.actor_type?.name ?? null;
}

/**
 * One `result_actors` row's un-post-processed `how_many`, keyed by `result_actors_id`
 * (`BIL-QAI-T-4b` gate fix). `formDetail.resultTypeResponse[0].actors` comes from
 * `InnovationUseService.getBilateralInnovationUseData` → `getActorsData`, whose `forEach`
 * overwrites `how_many = women + men` for every row whose `sex_and_age_disaggregation !== true`
 * (`innovation-use.service.ts:901-933`) — exactly the rows this mapper needs `how_many` from, so
 * that field can never be trusted off `container.actors`. The payload builder's `build()` reads
 * the raw `result_actors` rows directly (before `getActorsData` runs) and passes them here;
 * `project()` stays pure and defaults this to `[]`.
 */
export interface RawInnovationUseActorHowMany {
  result_actors_id: number;
  how_many: number | null;
}

/** GAP-7: innovation use carries no non-binary/unknown counts — only women/men/*_youth. */
interface InnovationUseTotals {
  total: number;
  women: number;
  men: number;
  women_youth: number;
  men_youth: number;
}

/**
 * A row saved with `sex_and_age_disaggregation = false` contributes its `how_many` to `total`
 * only — the four parts never see it (design.md §4.5 "Notes the AI side depends on"; `BIL-QAI-
 * T-4b` verification: `sex_and_age_disaggregation: false` + `how_many: 9` ⇒ `total` includes 9
 * and the four parts do not). A disaggregated row contributes its women/men/*_youth AND their
 * sum to `total`.
 *
 * The non-disaggregated branch reads `how_many` from `rawHowManyByActorId` — the un-post-
 * processed `result_actors` row (see {@link RawInnovationUseActorHowMany}) — never from
 * `actor.how_many`, which `getActorsData` has already overwritten to `women + men` (`0` for
 * exactly these rows) by the time it reaches `container.actors`. A row with no match in the raw
 * map contributes `0`, never the corrupted value.
 */
function sumInnovationUseActors(
  actors: any[],
  rawHowManyByActorId: ReadonlyMap<number, number | null>,
): InnovationUseTotals {
  return actors.reduce<InnovationUseTotals>(
    (acc, actor) => {
      if (actor?.sex_and_age_disaggregation === true) {
        const women = numberOrZero(actor?.women);
        const men = numberOrZero(actor?.men);
        acc.women += women;
        acc.men += men;
        acc.women_youth += numberOrZero(actor?.women_youth);
        acc.men_youth += numberOrZero(actor?.men_youth);
        acc.total += women + men;
      } else {
        const rawHowMany = rawHowManyByActorId.get(
          Number(actor?.result_actors_id),
        );
        acc.total += numberOrZero(rawHowMany);
      }
      return acc;
    },
    { total: 0, women: 0, men: 0, women_youth: 0, men_youth: 0 },
  );
}

/**
 * `"Investment (USD)".total` = Σ `kind_cash` over the three budget sources the form exposes
 * (initiative / bilateral project / partner), `null` when all three are empty — there is no
 * innovation-use-specific USD column (design.md §4.5). Rows come from `detail
 * .innovation_use_summary.{initiative_budget,bilateral_project_budget,partner_budget}`,
 * spread in by `BilateralService.buildInnovationSharedBudgetAndEvidenceExtras`
 * (`bilateral.service.ts:2225-2323`) via `buildInnovationUseBilateralSummary`.
 */
function sumInnovationUseInvestmentUsd(
  summary: Record<string, any> | undefined,
): number | null {
  const rows = [
    ...(Array.isArray(summary?.initiative_budget)
      ? summary.initiative_budget
      : []),
    ...(Array.isArray(summary?.bilateral_project_budget)
      ? summary.bilateral_project_budget
      : []),
    ...(Array.isArray(summary?.partner_budget) ? summary.partner_budget : []),
  ];

  if (rows.length === 0) {
    return null;
  }

  return rows.reduce(
    (sum: number, row: any) => sum + numberOrZero(row?.kind_cash),
    0,
  );
}

function mapInnovationUse(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
  rawInnovationUseActors: RawInnovationUseActorHowMany[] = [],
): Record<string, unknown> {
  const container = firstRow(formDetail?.resultTypeResponse);
  const actors: any[] = Array.isArray(container?.actors)
    ? container.actors
    : [];
  const measures: any[] = Array.isArray(container?.measures)
    ? container.measures
    : [];

  const userTypes = actors
    .map(mapActorTypeLabel)
    .filter((name): name is string => !!name);

  const rawHowManyByActorId = new Map<number, number | null>(
    rawInnovationUseActors
      .filter((row) => row && row.result_actors_id != null)
      .map((row) => [Number(row.result_actors_id), row.how_many]),
  );
  const totals = sumInnovationUseActors(actors, rawHowManyByActorId);

  // The whole list, not `measures[0]` — v0.1's builder read only the first row.
  const otherQuantitativeMeasures = measures
    .filter((m) => !!m?.unit_of_measure)
    .map((m) => ({
      unit_of_measure: m.unit_of_measure,
      quantity: numberOrNull(m.quantity),
    }));

  return {
    [INNOVATION_USE_FIELD_LABELS.USER_TYPES]: userTypes,
    [INNOVATION_USE_FIELD_LABELS.NUMBER_OF_PEOPLE_USING]: {
      total: totals.total,
      women: totals.women,
      men: totals.men,
      women_youth: totals.women_youth,
      men_youth: totals.men_youth,
    },
    [INNOVATION_USE_FIELD_LABELS.OTHER_QUANTITATIVE_MEASURES]:
      otherQuantitativeMeasures,
    [INNOVATION_USE_FIELD_LABELS.INVESTMENT_USD]: {
      total: sumInnovationUseInvestmentUsd(detail?.innovation_use_summary),
    },
  };
}

function mapPolicyChange(detail: Record<string, any>): Record<string, unknown> {
  const summary = detail?.policy_change_summary ?? {};

  return {
    [POLICY_CHANGE_FIELD_LABELS.POLICY_TYPE]:
      summary?.policy_type?.name ?? null,
    [POLICY_CHANGE_FIELD_LABELS.POLICY_STAGE]:
      summary?.policy_stage?.name ?? null,
    [POLICY_CHANGE_FIELD_LABELS.IMPLEMENTING_ORGANIZATIONS]:
      mapImplementingOrganizationNames(
        summary?.policy_implementing_organizations,
      ),
    [POLICY_CHANGE_FIELD_LABELS.USD_AMOUNT]: {
      amount: summary?.amount ?? null,
      status: summary?.amount_status_label ?? null,
    },
  };
}

export function mapTypeSpecific(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
  rawInnovationUseActors: RawInnovationUseActorHowMany[] = [],
): { type: string; fields: Record<string, unknown> } {
  const resultTypeId = Number(detail?.result_type_id) as ResultTypeEnum;
  const type = RESULT_TYPE_API_STRING[resultTypeId] ?? 'unknown';

  switch (resultTypeId) {
    case ResultTypeEnum.KNOWLEDGE_PRODUCT:
      return { type, fields: mapKnowledgeProduct(detail, formDetail) };
    case ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
      return { type, fields: mapCapacitySharing(detail) };
    case ResultTypeEnum.INNOVATION_DEVELOPMENT:
      return { type, fields: mapInnovationDevelopment(formDetail) };
    case ResultTypeEnum.INNOVATION_USE:
      return {
        type,
        fields: mapInnovationUse(detail, formDetail, rawInnovationUseActors),
      };
    case ResultTypeEnum.POLICY_CHANGE:
      return { type, fields: mapPolicyChange(detail) };
    default:
      return { type, fields: {} };
  }
}
