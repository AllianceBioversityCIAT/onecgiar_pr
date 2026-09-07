// @akili-spec changes/results-aow-column-filter (RAC-T-2)
/**
 * Display labels for the bucket-key vocabulary the Overview's `?scope=` and the Results tab's
 * Area of Work column / (RAC-T-3) `?section=` filter share (RAC-DD-3, design.md §6.2).
 *
 * An AoW code (`AOW01`, upper-case work-package acronym) has no dictionary entry and renders
 * as-is; only the three fixed, program-level keys translate to a human label. Kept in its own
 * file (not the filter service) so RAC-T-3 can import it without this task wiring the Section
 * filter control.
 */
export const PROGRAMME_RESULTS_FIXED_SECTION_LABELS: Readonly<Record<string, string>> = {
  INTERMEDIATE: 'Intermediate outcomes',
  EOI_2030: '2030 outcomes',
  UNTAGGED: 'Not tagged'
};

/** `AOW01` (etc.) renders as-is; the three fixed keys translate to their display label. `''` → `''`. */
export function sectionLabel(key: string | null | undefined): string {
  if (!key) return '';
  return PROGRAMME_RESULTS_FIXED_SECTION_LABELS[key] ?? key;
}
