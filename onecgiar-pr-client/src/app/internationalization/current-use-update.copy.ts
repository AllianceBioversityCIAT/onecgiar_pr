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
  /** Hard limit on the expansion narrative, per the story. */
  maxNarrativeWords: 100,
  // P2-3985 — the short reason the bilateral MDS footer / Submit alert shows next to the item.
  mismatchReason: (actorsTotal: number, gap: number, direction: 'more than' | 'fewer than', total: number) =>
    `the user categories add up to ${actorsTotal}, ${gap} ${direction} the total cumulative use of ${total}`,
  mismatch: (actorsTotal: number, gap: number, direction: 'more than' | 'fewer than', total: number, previous: number, added: number) =>
    `The user categories add up to ${actorsTotal}, which is ${gap} ${direction} the total cumulative use of ${total} (${previous} previously reported + ${added} added this period). Adjust the categories or the number of new users.`
};
