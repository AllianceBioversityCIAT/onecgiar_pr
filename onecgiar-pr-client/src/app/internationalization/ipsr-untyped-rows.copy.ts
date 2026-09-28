/** Night sweep 2026-09-23 (IPSR-3 / IPSR-5) — alert shown when an IPSR Step-1 / Step-3 save is refused. */
export const IPSR_UNTYPED_ROWS_COPY = {
  title: 'Some actor rows need a type before saving',
  actors: (n: number) => `${n} actor row(s) without an actor type`,
  message: (parts: string[]) => `Nothing was saved: ${parts.join(' and ')} would be lost. Select the actor type, or remove the row, and save again.`
};
