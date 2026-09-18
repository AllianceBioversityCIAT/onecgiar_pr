// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4b)

/**
 * Frozen `sections.type_specific.fields` label constants — one `as const` object per result
 * type that carries typed values under contract v0.2.
 *
 * These are the single source of truth for the per-type field labels: the payload builder's
 * mappers (`mappers/type-specific.mapper.ts`), the fixtures under `fixtures/*.fixture.json`,
 * and the contract copy (`docs/bilateral-module/integration-contracts.md` → "Quality
 * assessment (outbound)" → "Type-specific fields (`sections.type_specific`)") all read the
 * same literal strings from here, so none of the three can drift from the other two
 * (`BIL-QAI-R-2` scenario "Type-specific fields carry frozen labels and typed values";
 * `BIL-QAI-AC-16`).
 *
 * Every literal below is copied verbatim from the contract's per-type `fields` table
 * (`docs/bilateral-module/integration-contracts.md:638-641`, mirrored at
 * `docs/specs/bilateral/qa-ai-traffic-light/design.md` §4.5) — never from memory of a
 * similar-sounding label.
 *
 * A form label change is a contract break: bump `contract_version`, update the constant here
 * and the fixtures, and notify Daniela before either side stops accepting the previous label.
 */

/** Policy change — integration-contracts.md:638. */
export const POLICY_CHANGE_FIELD_LABELS = {
  POLICY_TYPE: 'Policy type',
  POLICY_STAGE: 'Policy stage',
  IMPLEMENTING_ORGANIZATIONS: 'Implementing organizations',
  USD_AMOUNT: 'USD amount',
} as const;

/** Innovation use — integration-contracts.md:639. */
export const INNOVATION_USE_FIELD_LABELS = {
  USER_TYPES: 'User types',
  NUMBER_OF_PEOPLE_USING: 'Number of people using',
  OTHER_QUANTITATIVE_MEASURES: 'Other quantitative measures',
  INVESTMENT_USD: 'Investment (USD)',
} as const;

/** Capacity sharing — integration-contracts.md:640. */
export const CAPACITY_SHARING_FIELD_LABELS = {
  NUMBER_OF_PEOPLE_TRAINED: 'Number of people trained',
  LENGTH_OF_TRAINING: 'Length of training',
  DELIVERY_METHOD: 'Delivery method',
  IMPLEMENTING_ORGANIZATIONS: 'Implementing organizations',
} as const;

/** Innovation development — integration-contracts.md:641. */
export const INNOVATION_DEVELOPMENT_FIELD_LABELS = {
  INNOVATION_TYPOLOGY: 'Innovation typology',
  READINESS_LEVEL: 'Readiness level',
  INNOVATION_DEVELOPERS: 'Innovation developers',
} as const;
