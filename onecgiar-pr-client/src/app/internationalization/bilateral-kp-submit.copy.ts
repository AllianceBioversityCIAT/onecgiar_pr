/**
 * P2-3980: confirmation shown when a bilateral Knowledge Product is submitted for review. A KP skips
 * the AI quality check, so the dialog is the only checkpoint before the result reaches the Science Program.
 */
export const BILATERAL_KP_SUBMIT_COPY = {
  title: 'Submit for review',
  body: 'This result will be sent to the Science Program for review.',
  confirm: 'Submit',
  cancel: 'Cancel',
} as const;
