# ai-job-card

**What this owns:** renders one `NormalizedBilateralAiListJob` as a card in one of 6 visual
variants (`AIQ-R-9` B-D, `AIQ-DD-8` parity). Presentational, `OnPush`, input-driven — no HTTP, no
service injection, no timer of its own.

## Invariants
- `variant()` is derived, never stored: `PROCESSING` + elapsed ≥ 30 min (`STILL_RUNNING_CEILING_MS`,
  duplicated from `bilateral-ai.service.ts`'s private `CEILING_MS` — not exported, so not imported)
  → `still_running`; `PROCESSING` otherwise → `running`; `PENDING` → `waiting`; `FAILED` → `failed`;
  `COMPLETED` → `completed` if `resultCount > 0` else `no_candidates`.
- Never renders a percentage or an estimated start time (`AIQ-R-9` B/C) — running cards show an
  indeterminate 5-segment rail (`stageSegments()`), waiting cards show a position word only
  (`positionLabel()`: "Next" at `jobsAhead === 0`, else "N ahead").
- "Try again" (`failed` variant) is disabled by `isJobAlive()`, a computed read directly off
  `job().status`, not off the branch it renders in — mirrors `ai-processing-panel`'s same guard so a
  future status shape change cannot silently re-enable it.
- The completed-with-drafts card mounts `app-ai-provenance-notice` (`variant="line"`) — this is the
  fifth-to-sixth-surface move `AIQ-DD-6` describes; never hand-roll the sentence here.
- `highlighted()` (`AIQ-R-8` D) is NOT color-only (a11y review, WCAG 1.4.1): it adds a
  `ring-2 ring-offset-2` (a shape cue distinct from a running card's `border-primary-200`), a
  visually-hidden `copy.highlightedSrText` span, and `aria-current="true"`. A highlighted RUNNING
  card must still read as visually different from a plain running card — attempt 1 reused the same
  border class for both and was rightly flagged.
- Every user-readable text color is `--pr-text-muted` or darker — never `--pr-text-subtle` (a11y
  review: ~3.0:1 on white, below WCAG AA at 10-11px). `--pr-text-subtle` is not used anywhere in this
  template, including decorative dot separators (kept consistent rather than split by "is this text
  or not").

## Data flow
- `waitReasonText` and `expectation` are resolved by the HOST (`ai-processes-drawer`) over the full
  job list / expectations cache — this card cannot do a cross-job lookup on its own. The host calls
  `bilateral-ai-job.model.ts`'s `waitReasonCopy(reason, projectName)`; this card never computes wait-
  reason text itself (attempt 1 duplicated that switch inline — a11y/spec review both flagged it).
- `now` is a tick the host owns (only while the drawer is open); this component never reads
  `Date.now()` directly, so every render is reproducible from its inputs alone. A running/
  still-running card's elapsed clock reads `job.startedDate` (falling back to `queueEntryDate` only
  while the server has not set it yet) — NOT `queueEntryDate` once running, or elapsed would
  double-count time already spent waiting (spec review fix).

## Gotchas
- `NormalizedBilateralAiListJob` carries `documentCount`/`audioCount` (numbers), not
  `documentKeys`/`audioKeys` (arrays) like the single-job shape `buildStepperModel` was written
  for — that function cannot be reused here. `currentStageLabel`/`stageSegmentIndex` are a
  deliberately separate, count-based implementation local to this file.
- `mixClassFromCounts` is exported from this file (not `bilateral-ai-job.model.ts`) so the drawer
  can key its `expectations` map the same way this card derives its own mix — keep the two in sync
  if either changes.

## Decisions
- Card is presentational/input-driven rather than service-injecting — because the drawer already
  owns the full job list and every cross-job computation; a second consumer of the service would
  duplicate the diffing/expectations-cache logic `BilateralAiService` already does.

**Verified:** 2026-09-29 · JuanGuzman-io/p2-3853-jira-understanding · 0771414d6
