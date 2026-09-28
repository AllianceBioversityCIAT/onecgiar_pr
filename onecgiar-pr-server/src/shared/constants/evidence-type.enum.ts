export enum EvidenceTypeEnum {
  MAIN = 1,
  SUPPLEMENTARY = 2,
  PICTURES = 3,
  MATERIALS = 4,
  IPSR_WORKSHOP = 5,
  /** Evidence of user need / user demand (e.g. innovation development). */
  USER_NEED_USER_DEMAND = 6,
  /** P2-3824: IPSR Step 3 evidence, one list per component (core / enabler) and level. */
  IPSR_STEP_THREE = 7,
}

/** P2-3824: the two lists a Step 3 component carries (`evidence.ipsr_evidence_level`). */
export enum IpsrEvidenceLevelEnum {
  READINESS = 'readiness',
  USE = 'use',
}

/**
 * P2-3824: most pieces of Step 3 evidence one component may carry, readiness and use together.
 * The client disables "Add evidence" at the same number; the server rejects a seventh.
 */
export const IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT = 6;
