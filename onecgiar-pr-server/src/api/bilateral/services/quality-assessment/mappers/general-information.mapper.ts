// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * `sections.general_information` — title, description, result level label and lead contact
 * person. `title`/`description` come from the persisted result (`BilateralService.findOne`);
 * `result_level` and `lead_contact_person` need the label enrichment `getBilateralResultById`
 * carries (`commonFields.lead_contact_person_data.display_name` — design.md §5 `DD-2`
 * "a label missing from the enriched detail needs a mapper fallback").
 */
export function mapGeneralInformation(
  detail: Record<string, any>,
  formDetail: Record<string, any>,
): Record<string, unknown> {
  const commonFields = formDetail?.commonFields ?? {};

  return {
    title: detail?.title ?? commonFields.result_title ?? null,
    description: detail?.description ?? commonFields.result_description ?? null,
    result_level: detail?.obj_result_level?.name ?? null,
    // `lead_contact_person_data` is an AD enrichment `_loadBilateralBaseData` performs only when
    // `lead_contact_person_id` is set, the `ad_users` row is found AND active, and its optional
    // `AdUserRepository` injection resolved. Reading it alone meant any one of those failing
    // produced `null` for a result that plainly shows the person on screen. `result
    // .lead_contact_person` is a `text` column carrying the same display string the form wrote,
    // so it is the fallback: same value, none of the preconditions.
    lead_contact_person: firstNonEmptyString(
      commonFields.lead_contact_person_data?.display_name,
      commonFields.lead_contact_person,
      detail?.lead_contact_person,
    ),
  };
}

function firstNonEmptyString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
