# Tasks: `changes/qa-evidence-link-scheme`

- **Status:** `done` — `QEL-T-1` PASS 2026-09-28
- **Budget:** 1 task · ~80 LOC · 1 review round

### `QEL-T-1`: Normalise evidence links in the payload and sanitise per-evidence reasons

- **Type:** `server`
- **Implements:** `QEL-R-1`..`QEL-R-4`
- **Design:** `QEL-DD-1`, `QEL-DD-2`
- **Files (expected):**
  - `onecgiar-pr-server/src/api/bilateral/services/quality-assessment/mappers/evidence.mapper.ts` + its spec, or `bilateral-quality-payload.builder.spec.ts`
  - `bilateral-quality-assessment.client.ts` + `bilateral-quality-assessment.client.spec.ts`
- **Depends on:** `—`
- **Skills:** `nestjs-expert`, `tdd`
- **Review:** `full` (privacy surface, and it touches the AI payload contract, override b)
- **Verification:**
  - **Falsifier:** covers `QEL-AC-1`..`QEL-AC-5`. Three mutations, each red on a named case:
    - (a) drop the scheme prefix → `QEL-AC-1` red, `www.google.com` is sent;
    - (b) skip the reason sanitiser → `QEL-AC-3` red, the raw Playwright text with the host;
    - (c) redact only, without the tool-error replacement → `QEL-AC-3` red, the reason still reads `Page.goto: … [redacted]`.
  - **Red run:** `cd onecgiar-pr-server && npx jest --silent --forceExit --testPathPattern="quality-assessment|quality-payload"`. `QEL-AC-1` and `QEL-AC-3` fail on current code.
  - **Disqualifier:**
    - Test through `mapEvidence` / the payload builder, and through the client's public call that parses a 2xx body (mock the HTTP layer the way the existing client spec does). Never test a private helper alone.
    - Never run the unscoped server suite.
  - **Consumers:**
    - `bilateral-quality-payload.builder.ts:175` (`mapEvidence`)
    - `bilateral-quality-assessment.service.ts` (persists `outcome.evidence`, `:332`/`:381`)
    - the client drawer (renders `reason` verbatim; not changed)
- **Definition of done:**
  - [x] `QEL-AC-1`..`QEL-AC-5` each have a named passing case
  - [x] All three mutations executed and observed **red**
  - [x] Scoped jest green · eslint `--quiet` on the touched files · no new tsc errors on the touched files
- **Status:** [x] — PASS attempt 2, 2026-09-28 (`execution.md` → `QEL-T-1`)
