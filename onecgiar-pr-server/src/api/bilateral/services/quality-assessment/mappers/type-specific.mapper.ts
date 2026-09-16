// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { ResultTypeEnum } from '../../../../../shared/constants/result-type.enum';

/**
 * `sections.type_specific` — one dispatcher per `ResultTypeEnum`, each returning
 * `{ type, fields }` where `fields` is a flat label → visible-value object (design.md §5
 * "Payload builder"). Unknown / not-yet-modelled types fall through to `{ type, fields: {} }`
 * (also the shape used for `OTHER_OUTPUT`, which has no dedicated bilateral repository query —
 * `api/bilateral/handlers/noop.handler.ts` is the ingestion-side precedent for "accepted, no
 * extra processing").
 *
 * Primary source is `ResultsService.getBilateralResultById`'s `resultTypeResponse` — the same
 * repository reads the review drawer uses, already carrying catalogue names next to their ids
 * (`result.repository.ts` `get<Type>BilateralResultById`). `BilateralService.findOne`'s
 * `*_summary` blocks are the fallback for Knowledge Product, whose bilateral summary is
 * deliberately thin (public `handle` only).
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

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function mapCapacitySharing(
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const row = firstRow(formDetail?.resultTypeResponse);
  if (!row) {
    return {};
  }

  return {
    'Delivery method': row.delivery_method_name ?? null,
    'Length of training': row.term_name ?? null,
    'Number of women trained': numberOrNull(row.female_using),
    'Number of men trained': numberOrNull(row.male_using),
    'Number of non-binary people trained': numberOrNull(row.non_binary_using),
    'Number of people trained whose gender is unknown': numberOrNull(
      row.has_unkown_using,
    ),
  };
}

function mapInnovationDevelopment(
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const row = firstRow(formDetail?.resultTypeResponse);
  if (!row) {
    return {};
  }

  const level = numberOrNull(row.level);
  const levelName = row.name ?? null;
  const readinessLevel =
    level != null
      ? `Level ${level}${levelName ? ` — ${levelName}` : ''}`
      : (levelName ?? null);

  const fields: Record<string, unknown> = {
    'Innovation typology': row.innovation_type_name ?? null,
    'Innovation developers': row.innovation_developers ?? null,
    'Readiness level': readinessLevel,
  };

  if (row.project_name) {
    fields['Contributing project'] = row.project_name;
  }

  return fields;
}

function mapInnovationUse(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
): Record<string, unknown> {
  // `enrichBilateralResultResponse` deletes `results_innovations_use_object` off the
  // response after replacing it with `innovation_use_summary`
  // (`bilateral.service.ts:3672` `delete filtered.results_innovations_use_object;`, built by
  // `buildInnovationUseBilateralSummary` at `bilateral.service.ts:3209-3357`) — the level
  // label and the "to be determined" flag both live on `detail.innovation_use_summary`.
  const levelName =
    detail?.innovation_use_summary?.innovation_use_level?.name ?? null;
  const toBeDetermined =
    !!detail?.innovation_use_summary?.innov_use_to_be_determined;

  const fields: Record<string, unknown> = {
    'Innovation use level': levelName,
    'To be determined': toBeDetermined,
  };

  // `_loadBilateralResultTypeData` calls `InnovationUseService.getBilateralInnovationUseData`
  // whenever that service is injected — and `ResultsModule` does import `InnovationUseModule`
  // (`results.service.ts:3925-3940`) — which returns a single-element array
  // `[{ actors, organizations, measures, investment_partners, investment_projects }]`
  // (`innovation-use.service.ts:1128-1160`), not a flat per-row record.
  const container = firstRow(formDetail?.resultTypeResponse);
  const actors: any[] = Array.isArray(container?.actors)
    ? container.actors
    : [];
  const measures: any[] = Array.isArray(container?.measures)
    ? container.measures
    : [];

  if (actors.length > 0) {
    // `ResultActor` rows (`result-actors/entities/result-actor.entity.ts`); sum across every
    // current-section actor row — `how_many` is `getActorsData`'s own recomputed total
    // (`innovation-use.service.ts:901-933`, `= women + men`), not an independent count, so it
    // is never read here.
    const totals = actors.reduce(
      (acc, actor) => {
        acc.women += numberOrNull(actor?.women) ?? 0;
        acc.men += numberOrNull(actor?.men) ?? 0;
        acc.women_youth += numberOrNull(actor?.women_youth) ?? 0;
        acc.men_youth += numberOrNull(actor?.men_youth) ?? 0;
        return acc;
      },
      { women: 0, men: 0, women_youth: 0, men_youth: 0 },
    );
    fields['Number of women using the innovation'] = totals.women;
    fields['Number of men using the innovation'] = totals.men;
    fields['Number of women youth using the innovation'] = totals.women_youth;
    fields['Number of men youth using the innovation'] = totals.men_youth;
  }

  // `ResultIpMeasure` rows (`result-ip-measures/entities/result-ip-measure.entity.ts`); only
  // the first measure is reported, matching the single "Unit of measure" / "Quantity" pair the
  // contract carries for this type.
  const measure = firstRow(measures);
  if (measure?.unit_of_measure) {
    fields['Unit of measure'] = measure.unit_of_measure;
    fields['Quantity'] = numberOrNull(measure.quantity);
  }

  return fields;
}

function mapPolicyChange(
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const row = firstRow(formDetail?.resultTypeResponse);
  if (!row) {
    return {};
  }

  const implementingOrganizations = (
    Array.isArray(row.implementing_organization)
      ? row.implementing_organization
      : []
  )
    .map((org: any) => org?.institution_name || org?.acronym)
    .filter((name: unknown): name is string => !!name);

  return {
    'Policy type': row.policy_type_name ?? null,
    'Policy stage': row.policy_stage_name ?? null,
    'Implementing organizations': implementingOrganizations,
  };
}

export function mapTypeSpecific(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
): { type: string; fields: Record<string, unknown> } {
  const resultTypeId = Number(detail?.result_type_id) as ResultTypeEnum;
  const type = RESULT_TYPE_API_STRING[resultTypeId] ?? 'unknown';

  switch (resultTypeId) {
    case ResultTypeEnum.KNOWLEDGE_PRODUCT:
      return { type, fields: mapKnowledgeProduct(detail, formDetail) };
    case ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
      return { type, fields: mapCapacitySharing(formDetail) };
    case ResultTypeEnum.INNOVATION_DEVELOPMENT:
      return { type, fields: mapInnovationDevelopment(formDetail) };
    case ResultTypeEnum.INNOVATION_USE:
      return { type, fields: mapInnovationUse(detail, formDetail) };
    case ResultTypeEnum.POLICY_CHANGE:
      return { type, fields: mapPolicyChange(formDetail) };
    default:
      return { type, fields: {} };
  }
}
