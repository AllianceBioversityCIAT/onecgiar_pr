// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * `sections.geographic_location` — scope label, region/country/sub-national names.
 * Source: `BilateralService.findOne` relations (`obj_geographic_scope`, `result_region_array`,
 * `result_country_array` + its `result_countries_subnational_array`). Empty arrays are kept
 * (never omitted) so the section key stays present per contract even with nothing to report.
 */
export function mapGeographicLocation(
  detail: Record<string, any>,
): Record<string, unknown> {
  const regionRows: any[] = Array.isArray(detail?.result_region_array)
    ? detail.result_region_array
    : [];
  const countryRows: any[] = Array.isArray(detail?.result_country_array)
    ? detail.result_country_array
    : [];

  const regions = regionRows
    .map((row) => row?.region_object?.name)
    .filter((name): name is string => !!name);

  const countries = countryRows
    .map((row) => row?.country_object?.name)
    .filter((name): name is string => !!name);

  const subNational = countryRows
    .flatMap((row) =>
      Array.isArray(row?.result_countries_subnational_array)
        ? row.result_countries_subnational_array
        : [],
    )
    .map((row: any) => row?.clarisa_subnational_scope_object?.name)
    .filter((name): name is string => !!name);

  return {
    scope: detail?.obj_geographic_scope?.name ?? null,
    regions,
    countries,
    sub_national: subNational,
  };
}
