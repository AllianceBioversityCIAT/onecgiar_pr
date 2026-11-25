/**
 * P2-3537 §4 / P2-3985 — copy of the Innovation Use "Current Use Update" block, shared by the W1/W2 form
 * (`shared/components/innovation-use-form`) and the W3/bilateral full metadata
 * (`pages/bilateral/.../type-innovation-use`). One source, so the mismatch message the story quotes
 * cannot read differently on the two routes.
 */
export const CURRENT_USE_UPDATE_COPY = {
  title: 'Current Use Update',
  description:
    'This innovation was already reported before, so only the change since then is asked for here. The user categories below hold the cumulative total.',
  previousLabel: 'Previous reported use:',
  newUsersLabel: 'New users added during this reporting period',
  totalLabel: 'Total cumulative current use to date:',
  narrativeLabel: 'Brief narrative on how the use expanded',
  placeholder: 'Write some...',
  /** IU26-R-5 — the 2026 narrative label (the year is the result's phase year). */
  narrativeLabel2026: (year: number | string) => `Brief narrative on how use changed in ${year}`,
  /** IU26-R-4 — heading of the previous-phase reference block. */
  previousUseHeading: (year: number | string | null) =>
    year ? `Previous reported use (FY${year} · for reference only)` : 'Previous reported use (for reference only)',
  /** IU26-R-4 / R-7 — category labels, shared by the previous-use block and the totals tiles. */
  categoryLabels: {
    actors: 'Actors',
    actorsIndividuals: 'Actors - individuals',
    households: 'Households',
    organizations: 'Organizations',
    measures: 'Other quantitative measures'
  },
  /** IU26-R-6 — the top question on 2026 W1/W2 results. */
  question2026: (year: number | string) => `Innovation use in ${year} supported by evidence (calculated from the categories below)`,
  /** IU26-R-8 — row labels of 2026 current-use rows. */
  howManyTotalLabel: 'How many – total',
  quantityTotalLabel: 'Quantity – total',
  /** IU26-R-11 — "of which NEW" input labels (W1/W2 2026 current-use rows only; optional). */
  newUsersActorLabel: 'Of which NEW users (optional)',
  newUsersOfWhichLabel: 'Of which NEW (optional)',
  /** IU26-R-11 — label the mandatory-field scan lists while a NEW is above its total. */
  newUsersMarkerLabel: 'Of which NEW users (cannot be higher than the total)',
  /** IU26-R-11 — the message when NEW is higher than the row total. */
  newUsersExceeds: (newUsers: number, total: number) => `New users (${newUsers}) cannot be higher than the total (${total}).`,
  /** IU26-R-7 — "of which new" line on each total tile. */
  ofWhichNew: (value: number | null) => (value === null ? 'Of which new: not available' : `Of which new: ${value}`),
  /** IU26-R-8 — guidance above the rows, verbatim from the ticket. `withNewUsers` appends the NEW sentence (W1/W2 only). */
  guidance: (year: number | string, withNewUsers = false) => ({
    title: `Report ${year} use only.`,
    lines: [
      `For each actor type, organization type and other quantitative measure, enter the total number using the innovation in ${year}. This total is made up of two groups:`,
      `• continuing users: users reported in 2025 or earlier who, according to your ${year} evidence, are still using the innovation; and`,
      `• new users: users who started using the innovation in ${year}.`,
      `Continuing users are reported again in ${year}, and this is expected. Each year's figure stands on its own and is never added to earlier years.`,
      `The previously reported figures shown above are for reference only. Do not copy them across: include earlier users only if your ${year} evidence shows they still use the innovation. If you have no ${year} evidence yet, select "This is yet to be determined".`,
      ...(withNewUsers ? [`If you know how many of the ${year} users are new, enter that number in "Of which NEW users".`] : [])
    ]
  }),
  /** Hard limit on the expansion narrative, per the story. */
  maxNarrativeWords: 100,
  // P2-3985 — the short reason the bilateral MDS footer / Submit alert shows next to the item.
  mismatchReason: (actorsTotal: number, gap: number, direction: 'more than' | 'fewer than', total: number) =>
    `the user categories add up to ${actorsTotal}, ${gap} ${direction} the total cumulative use of ${total}`,
  mismatch: (actorsTotal: number, gap: number, direction: 'more than' | 'fewer than', total: number, previous: number, added: number) =>
    `The user categories add up to ${actorsTotal}, which is ${gap} ${direction} the total cumulative use of ${total} (${previous} previously reported + ${added} added this period). Adjust the categories or the number of new users.`
};
