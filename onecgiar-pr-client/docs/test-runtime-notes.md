# Making the local test runs cheaper — measured notes, not a plan yet

Working notes from 15-Sep-2026, kept so the next attempt starts from numbers instead of guesses.
Nothing here is implemented; the tooling that *is* implemented is described in `../CLAUDE.md`
(§ Memory, and § selecting only affected specs).

## What was measured

| Thing | Measured | Where it came from |
|---|---|---|
| Webpack compile, **per batch** | **21–51 s** | 8 batches of a 63-spec CT run |
| A passing CT spec | 0.4–2 s | `pr-input` run, 27 green tests in ~11 s |
| A **failing** CT assertion | **10 s each** | `defaultCommandTimeout: 10000` in `cypress.config.js` |
| Jest suite, whole | 574 specs | `npx jest --listTests` |
| Jest suite, affected by one branch | 119 specs (**-79 %**) | `--changedSince` |
| CT suite red rate | ~3–4 of every 8 specs | batches 1–3 of the full run |

## The three levers, biggest first

**1. The red specs are the clock, not the green ones.** Every failing assertion burns the full
10 s retry window before it gives up. With ~25 red specs out of 63, that is minutes of the run
spent waiting for elements that were renamed in the field redesign (`.fch_tag`, `div.field_card`)
and are never coming back. Fixing or `it.skip`-ing them buys more wall-clock than any parallelism
would — and a skipped spec with the reason written above it is honest, where a shortened timeout
would just hide it.

**2. Compilation is paid per batch, and batching is what keeps the machine alive.** 8 batches
cost ~4 minutes of webpack before a single assertion runs. Bigger batches mean fewer compiles and
a higher memory peak; smaller batches the reverse. This is the real trade and there is no free
side — which is why `CT_BATCH_SIZE` is a dial and the default follows the memory light.

**3. Only run what the change can reach.** Already built: `npm run test:changed`,
`npm run test:ct:changed`, `npm run affected`. Jest does it from its own module graph;
`scripts/ct-affected.js` does the same walk for `*.cy.ts`.

## Ideas worth trying, with what to watch out for

- **Parallel batches.** Tempting, and the reason it was *not* done: two batches means two webpack
  dev-servers, which is precisely the memory peak the batching exists to avoid. Only worth
  revisiting behind the memory light, and never above 2.
- **Reuse one dev-server across batches.** Would erase most of the ~4 minutes — but the growing
  module graph of that server is the original problem (see `run-ct-batched.js`). A middle ground
  is a bigger batch on a green machine, which the dial already allows.
- **Persistent webpack cache** (`cache: { type: 'filesystem' }`) — the one idea that may cut the
  compile cost without raising the peak. Untested.
- **Split `ct-utils`' `CustomFieldsModule` import.** Today every custom-fields spec reaches all 23
  components through `cypress/support/ct-utils.ts:6`, so touching one field marks 52 of 63 specs
  affected. Mounting components individually would make the affected-spec selection much sharper.
  This changes specs, so it is its own task.
- 🛑 **Do not lower `defaultCommandTimeout` to make the suite look faster.** It would cut the cost
  of the red specs without fixing them, and would start failing slow-but-correct assertions.
