// @akili-spec quality-assurance/qa-results-feed
import { ResultTypeEnum } from '../../../shared/constants/result-type.enum';

/**
 * QRF-DD-2: internal `result.result_type_id` -> catalog `result_types[].key` map for the 9
 * catalogued types. It is deliberately NOT a property of `CatalogResultType`: that would enter the
 * content hash and force a `catalog_version` bump with no contract change (catalog DD-12).
 *
 * Absent on purpose: `CAPACITY_CHANGE` (3) and `COMPLEMENTARY_INNOVATION` (11) have no catalog key,
 * so their results are `type_not_catalogued` (QRF-R-3 / QRF-R-8).
 */
export const RESULT_TYPE_KEY_BY_ID: Readonly<Record<number, string>> = {
  [ResultTypeEnum.POLICY_CHANGE]: 'policy_change',
  [ResultTypeEnum.INNOVATION_USE]: 'innovation_use',
  [ResultTypeEnum.OTHER_OUTCOME]: 'other_outcome',
  [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: 'capacity_sharing',
  [ResultTypeEnum.KNOWLEDGE_PRODUCT]: 'knowledge_product',
  [ResultTypeEnum.INNOVATION_DEVELOPMENT]: 'innovation_development',
  [ResultTypeEnum.OTHER_OUTPUT]: 'other_output',
  [ResultTypeEnum.IMPACT_CONTRIBUTION]: 'impact_contribution',
  [ResultTypeEnum.INNOVATION_USE_IPSR]: 'innovation_package',
};

/** Inverse of `RESULT_TYPE_KEY_BY_ID`; the map is one-to-one (asserted by the spec). */
export const RESULT_TYPE_ID_BY_KEY: Readonly<Record<string, number>> =
  Object.fromEntries(
    Object.entries(RESULT_TYPE_KEY_BY_ID).map(([id, key]) => [key, Number(id)]),
  );

/** Ids that may ever be eligible, ascending. */
export const CATALOGUED_RESULT_TYPE_IDS: readonly number[] = Object.keys(
  RESULT_TYPE_KEY_BY_ID,
)
  .map(Number)
  .sort((a, b) => a - b);
