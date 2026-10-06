/**
 * P2-3110 — copy for the AI Review pop-up. The read-only notice shows when the open result cannot be
 * edited by this user (view-only access, closed phase, non-editable status): the same
 * `RolesService.readOnly` gate Section 1 uses, so the pop-up never writes what Section 1 would refuse.
 */
export const AI_REVIEW_COPY = {
  readOnlyNotice:
    'You can review the AI suggestions, but this result cannot be edited with your current access or in this reporting phase.'
};
