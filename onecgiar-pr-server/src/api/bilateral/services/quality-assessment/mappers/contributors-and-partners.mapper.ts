// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)
import { UnresolvableLabelError } from './errors';

/**
 * `sections.contributors_and_partners` — centres, lead/contributing projects, external
 * partners and the ToC alignment, all as labels (BIL-QAI-R-2). Sources: `BilateralService
 * .findOne` for centres/partners/ToC mappings, `ResultsService.getBilateralResultById` for the
 * project lead flag and the ToC progressive narrative (design.md §5 `DD-2`).
 *
 * ToC fallback: the enriched detail's `toc_mappings[].title` is the only source that carries
 * the ToC node's label (neither read exposes a title through the id-only `toc_result_id`
 * elsewhere). When a ToC mapping is present but its title cannot be resolved, this mapper
 * throws {@link UnresolvableLabelError} rather than emit an empty `result` string — per
 * design.md §5 "never emit an empty label silently".
 *
 * `formDetail.tocMetadata` is `ResultsService.getBilateralResultById`'s
 * `tocResponse.result_toc_result` (`results.service.ts:3708`) — itself
 * `ResultsTocResultsService.getTocByResultV2`'s `serializeInitiativeEntry(...)` return
 * (`results-toc-results.service.ts:710-771`): a flat `{ planned_result, initiative_id,
 * official_code, short_name, result_toc_results: [...] | null, ... }`, NOT wrapped in another
 * `result_toc_result` layer. `result_toc_results` can legitimately be `null`
 * (`results-toc-results.service.ts:749`), hence the `?? []`.
 *
 * `mapping` itself (`detail.obj_results_toc_result[].toc_mappings[]`) comes from
 * `ResultRepository.getTocMappingsByResultId`'s `LEFT JOIN ... results_toc_result` inside a
 * `JSON_ARRAYAGG` (`result.repository.ts:3956-3987`): a result with an owning initiative but
 * no active ToC row still produces one truthy mapping object with every field `null` —
 * `{ toc_result_id: null, title: null, ... }`. That is "no mapping", not an unresolvable one;
 * only a mapping whose `toc_result_id` is present and whose `title` is still missing throws.
 */

function centerLabel(row: any): string | null {
  const institution = row?.clarisa_center_object?.clarisa_institution;
  return institution?.acronym || institution?.name || null;
}

function projectLabel(row: any): {
  title: string | null;
  funder: string | null;
} {
  const project = row?.obj_clarisa_project;
  return {
    title: project?.fullName || project?.shortName || null,
    funder:
      project?.obj_organization?.name ||
      project?.obj_organization?.acronym ||
      null,
  };
}

function mapCenters(detail: Record<string, any>): {
  lead_center: string | null;
  contributing_centers: string[];
} {
  const centers: any[] = Array.isArray(detail?.result_center_array)
    ? detail.result_center_array
    : [];
  const leadRow = centers.find(
    (row) => row?.is_leading_result === true || row?.is_leading_result === 1,
  );

  return {
    lead_center: leadRow ? centerLabel(leadRow) : null,
    contributing_centers: centers
      .filter((row) => row !== leadRow)
      .map(centerLabel)
      .filter((name): name is string => !!name),
  };
}

function mapProjects(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
): {
  lead_project: { title: string | null; funder: string | null } | null;
  contributing_projects: Array<{ title: string | null }>;
} {
  const formRows: any[] = Array.isArray(formDetail?.contributingProjects)
    ? formDetail.contributingProjects
    : [];

  if (formRows.length > 0) {
    const leadRow = formRows.find(
      (row) => row?.is_lead === true || row?.is_lead === 1,
    );
    return {
      lead_project: leadRow ? projectLabel(leadRow) : null,
      contributing_projects: formRows
        .filter((row) => row !== leadRow)
        .map((row) => ({ title: projectLabel(row).title }))
        .filter((row) => !!row.title),
    };
  }

  // Fallback: findOne's slim bilateral_projects summary has no lead flag — every project is
  // reported as contributing (design.md §13 Risk: label present, structure thinner).
  const slimRows: any[] = Array.isArray(detail?.bilateral_projects)
    ? detail.bilateral_projects
    : [];
  return {
    lead_project: null,
    contributing_projects: slimRows
      .map((row) => ({ title: row?.short_name ?? null }))
      .filter((row) => !!row.title),
  };
}

function mapExternalPartners(detail: Record<string, any>): Array<{
  name: string | null;
  type: string | null;
  role: string;
}> {
  const rows: any[] = Array.isArray(detail?.result_by_institution_array)
    ? detail.result_by_institution_array
    : [];

  return rows.map((row) => ({
    name: row?.name ?? row?.acronym ?? null,
    type: row?.institution_type_name ?? null,
    role: row?.is_leading_result ? 'Leading partner' : 'Partner',
  }));
}

function mapTheoryOfChange(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
  indicatorDescriptions: Record<string, string | null>,
): Record<string, unknown> {
  const tocRows: any[] = Array.isArray(detail?.obj_results_toc_result)
    ? detail.obj_results_toc_result
    : [];
  const ownerRow =
    tocRows.find((row) => row?.initiative_role === 'Owner') ?? tocRows[0];
  const mapping = ownerRow?.toc_mappings?.[0] ?? null;

  // `getTocMappingsByResultId`'s LEFT JOIN yields a truthy-but-empty mapping object
  // (`toc_result_id: null`) when the owning initiative has no active ToC row — treat that the
  // same as no mapping at all, not as an unresolvable one.
  if (!mapping || mapping.toc_result_id == null) {
    return {
      planned: false,
      level: null,
      result: null,
      indicator: null,
      contribution: null,
      why_reported: null,
    };
  }

  if (!mapping.title) {
    throw new UnresolvableLabelError(
      `Unable to resolve a title for ToC result toc_result_id=${mapping.toc_result_id} — ` +
        'the enriched detail carries only the id and no other read exposes its label.',
    );
  }

  const formTocResults: any[] = Array.isArray(
    formDetail?.tocMetadata?.result_toc_results,
  )
    ? formDetail.tocMetadata.result_toc_results
    : [];
  const formTocRow =
    formTocResults.find(
      (row: any) => row?.toc_result_id === mapping.toc_result_id,
    ) ??
    formTocResults[0] ??
    null;

  const formIndicator = formTocRow?.indicators?.[0] ?? null;
  let indicator: string | null = null;
  if (formIndicator?.toc_results_indicator_id != null) {
    const description =
      indicatorDescriptions?.[formIndicator.toc_results_indicator_id];
    if (!description) {
      throw new UnresolvableLabelError(
        'Unable to resolve indicator_description for ' +
          `toc_results_indicator_id=${formIndicator.toc_results_indicator_id} — no lookup ` +
          'entry was provided (ResultsService.getTocMetadata / TocResultsRepository is the ' +
          'source; see indicator-description-resolver.ts).',
      );
    }
    indicator = description;
  }

  return {
    planned: mapping.planned_result === 'Yes',
    level: mapping.level ?? null,
    result: mapping.title,
    indicator,
    // The figure the user reports against the indicator's target, persisted as
    // `result_indicators_targets.contributing_indicator`. Read from the SAME indicator
    // `indicator` above names, so the two cannot describe different rows.
    //
    // 🛑 Emitted as a STRING. The AI declares `contribution?: string | null` and answers 422 on
    // a number — measured twice on 2026-09-21 (result 11976), which is also why `contribution`
    // is deliberately NOT in `NUMERIC_LABEL_ALLOWLIST`: nothing numeric may pass here, and
    // listing it would only let a future regression through to the same rejection.
    contribution: readContribution(formIndicator),
    why_reported: formTocRow?.toc_progressive_narrative ?? null,
  };
}

/**
 * The contribution figure lives per target, and an indicator can carry several (one per year).
 * The first target that states one wins: a result states that figure once, and emitting an
 * array would change a scalar field of the contract.
 *
 * Returned as a string because the contract types the field that way. MySQL hands the DECIMAL
 * over as `"150.00"`, so it round-trips through `Number` first — the AI reads `"150"`, not the
 * column's storage scale.
 */
function readContribution(formIndicator: any): string | null {
  const targets: any[] = Array.isArray(formIndicator?.targets)
    ? formIndicator.targets
    : [];

  for (const target of targets) {
    const raw = target?.contributing_indicator;
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return String(value);
  }

  return null;
}

export function mapContributorsAndPartners(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
  indicatorDescriptions: Record<string, string | null> = {},
): Record<string, unknown> {
  const commonFields = formDetail?.commonFields ?? {};
  const { lead_center, contributing_centers } = mapCenters(detail);
  const { lead_project, contributing_projects } = mapProjects(
    detail,
    formDetail,
  );

  const noExternalPartners =
    commonFields.no_applicable_partner ??
    detail?.no_applicable_partner ??
    false;

  return {
    lead_center,
    contributing_centers,
    lead_project,
    contributing_projects,
    external_partners: mapExternalPartners(detail),
    no_external_partners: !!noExternalPartners,
    theory_of_change: mapTheoryOfChange(
      detail,
      formDetail,
      indicatorDescriptions,
    ),
  };
}
