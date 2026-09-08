/**
 * Coerce a flag that MySQL stores as `tinyint(1)` into a real three-state boolean.
 *
 * Why this exists (P2-3292, QA 7-Sep-2026): a `tinyint` column reaches the client as the NUMBER
 * `1` or `0`, never as `true` / `false`. Any consumer that compares it by identity — an
 * `app-pr-radio-button` matching `optionValue`, or a plain `=== true` — silently fails to match,
 * while every truthiness check around it keeps working. That asymmetry is what makes the defect so
 * convincing: the stored answer is correct, the reasons and the linked targets hydrate, the status
 * badge is right, and only the Yes/No control renders blank.
 *
 * Measured on prtest the same day, before touching anything: `GET .../get/general-information/
 * result/11494` and `GET .../results/get/11494` both answer `is_discontinued: 1` (int) for result
 * 6432, whose radio offers `value: false` / `value: true`.
 *
 * 🥇 `null` in, `null` out — and that is the load-bearing part. "Not answered" is a third state the
 * screen depends on (`[isComplete]="… != null"`, and the mandatory-field scan), so collapsing it to
 * `false` would report an unanswered question as answered "Yes".
 */
export function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return null;
  }
  return null;
}
