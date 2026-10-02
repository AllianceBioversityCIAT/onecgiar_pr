// @akili-spec notifications/primary-decline-rejects-result (PDR-T-3)
/**
 * Copy for `primary-decline-justification-dialog` — centralized per the NFR i18n rule
 * (requirements.md §7) and design.md §8.1. Title/message are templated by result code / SP code
 * so there is exactly one place that owns the exact wording `PDR-R-1`'s scenarios assert.
 */
export const PRIMARY_DECLINE_JUSTIFICATION_COPY = {
  /** `PDR-R-1` scenario: "DECLINE PRIMARY ROLE – 9391" (en dash, not a hyphen). */
  title: (resultCode: string): string => `DECLINE PRIMARY ROLE – ${resultCode}`,
  /** `PDR-R-1` scenario: "Please explain why SP09 declines to be the primary Science Program of this result." */
  message: (programCode: string): string => `Please explain why ${programCode} declines to be the primary Science Program of this result.`,
  label: 'Justification',
  placeholder: 'Please explain why your Science Program declines this result...',
  cancel: 'Cancel',
  confirm: 'Confirm'
} as const;
