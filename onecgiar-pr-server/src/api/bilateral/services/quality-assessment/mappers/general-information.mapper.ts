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
    lead_contact_person:
      commonFields.lead_contact_person_data?.display_name ?? null,
  };
}
