# Refactor: Angular 21 upgrade + PrimeNG → Spartan UI migration

**Branch:** `front-redesign-fields` (this is where all the work lives now).
**Status:** build green on Angular 21; **all custom-fields migrated off PrimeNG** (§3.4); the general-information loop bug is resolved (§6).
**Last update:** 2026-07-14.

This is the master context doc for the modernization of the PRMS client: moving off **PrimeNG** onto **Spartan UI + Tailwind**, which first required upgrading Angular. Read this before touching anything on `front-redesign-fields`.

---

## 1. The big picture / end goal

Migrate the whole client off PrimeNG onto **Spartan UI + Tailwind**, component by component, keeping the app shippable the entire time. Natural order:

```
Angular 19 → 21 ✅ → Spartan+Tailwind foundation ✅ → migrate components (in progress) → remove PrimeNG + sat-popover → Angular 22
```

Angular 22 is **blocked by PrimeNG** and comes LAST (see §5).

---

## 2. Branch history (and a mistake worth knowing)

- The signals refactor of the custom fields (pr-input/pr-select/pr-multi-select/pr-textarea → signals, s-select removed, navbar redesign, Cypress CT) lives on **`front-redesign-fields`**.
- The Angular upgrade + Spartan work was **initially (wrongly) branched from `staging`** as `angular-upgrade-19-22` — so it was built on the non-signals versions of the fields.
- That branch was then **merged into `front-redesign-fields`** (merge commit `a7bf2aae3`). Conflicts were resolved by keeping the **signals** structure and re-applying the Spartan swaps on top. `angular-upgrade-19-22` still exists (pushed to origin) as the source of those commits, but **`front-redesign-fields` is now the single source of truth**.

**Lesson:** work that depends on `front-redesign-fields` must branch from it, not from staging.

---

## 3. What was done (all on `front-redesign-fields`)

### 3.1 Angular 19 → 20 → 21 (lockstep)
- `@angular/*` → 21.2.18, `@angular/cli`/`@angular/build`/`@angular-devkit/build-angular` → 21.2.19, `@angular/cdk` → 21.2.14.
- **UI deps move in lockstep** (a lone `@angular/core` bump fails `ERESOLVE`): `primeng`/`@primeng/themes` → 21.x, `@ncstate/sat-popover` → 16.0.0, `@angular-eslint/*` → 21.4.0, `@typescript-eslint/*` → 8.63.0, **TypeScript → 5.9**.
- `tsconfig.json` base: `moduleResolution` `node` → **`bundler`** (Angular 21 + TS 5.9 package exports require it).
- `setup-jest.ts`: restored pre-21 lenient TestBed defaults (`errorOnUnknownElements/Properties: false`).
- PrimeNG 20 breaking changes fixed (renamed/removed modules): `dropdown`→`select`, `inputswitch`→`toggleswitch`, `calendar`→`datepicker`, `inputtextarea`→`textarea`. Angular 20: a non-assignable `[(ngModel)]` two-way binding split; the unused custom `secondary` theme palette dropped from `reportingTheme.ts`.

### 3.2 Spartan + Tailwind foundation
- Installed `tailwindcss@4` + `@tailwindcss/postcss` (`.postcssrc.json`), `@spartan-ng/brain` + `@spartan-ng/cli`, `clsx`, `class-variance-authority`, `tailwind-merge`, `tw-animate-css`.
- **Coexistence rule (critical):** Tailwind's global **preflight is NOT imported** in `src/styles.scss` (it would reset PrimeNG across all templates). Utilities stay opt-in. `@use` sits first (SCSS ordering).
- Details: [`spartan-tailwind-foundation.md`](./spartan-tailwind-foundation.md).

### 3.3 First component migration — `pr-input` + `pr-select` (0 PrimeNG)
- **`pr-input`**: `pInputText`→`<input hlmInput>`; `p-message`→styled `<div>`; `p-inputNumber` (number/currency)→native inputs. Currency uses `currencyRaw`/`onCurrencyFocus`/`onCurrencyBlur` (Intl USD, **formats on blur**, raw while editing so decimals work; value stays numeric). Kept the **signals** structure from front-redesign.
- **`pr-select`**: only the search box changed (`p-iconfield`/`p-inputicon`/`pInputText` → `<input hlmInput>` + `material-icons-round` search icon). The rest is a custom CDK virtual-scroll dropdown.
- Spartan `HlmInput` lives at `src/app/spartan/input` (alias `@spartan/input`, tsconfig path). Added via `ng g @spartan-ng/cli:ui input` with a hand-written `components.json`.
- Dropped `InputNumberModule` + `MessageModule` from `custom-fields.module.ts` (only pr-input used them). Kept `InputTextModule`/`IconFieldModule`/`InputIconModule` (still used by `pr-multi-select`).

### 3.4 Remaining custom fields → Spartan (0 PrimeNG in `custom-fields/`)

Same principle as 3.3: **native HTML + Tailwind/Spartan classes, no `@spartan-ng/brain` host-directives** (brain machinery is what caused the §6 loop). Facade (inputs/outputs/CVA) untouched → **zero consumer changes**. All four remaining PrimeNG usages removed:

| Component | Before (PrimeNG) | After |
|---|---|---|
| `pr-checkbox` | `<p-checkbox binary>` | `<input type="checkbox" class="pr-native-check">` + ngModel |
| `pr-radio-button` | `<p-radioButton>` | `<input type="radio" class="pr-native-radio">` + ngModel. Added a **unique `groupName` per instance** (`pr-radio-group-N`) so native radio grouping never bleeds across components. |
| `pr-multi-select` | search `p-iconfield`/`p-inputicon`/`pInputText` + inner `<p-checkbox>` ×2 | `<input hlmInput>` + `material-icons-round` search icon; native `.pr-native-check` |
| `pr-button` | `[pTooltip]` directive | new lightweight **`PrTooltipDirective`** (`[prTooltip]`) — renders a tooltip on `document.body` on hover (never clipped by the button's `overflow:hidden`), removed on leave/destroy. |

- Shared native checkbox/radio styling lives in the **global** `custom-fields.scss` (`.pr-native-check` / `.pr-native-radio`): 18px box, `neutral-1000` border, `primary-300` fill when checked — clones the old PrimeNG look. Tooltip styling: `.pr-tooltip` (bg `secondary-400`).
- `custom-fields.module.ts` now imports **only** `CommonModule, FormsModule, ScrollingModule, HlmInput` — every PrimeNG module removed (`SelectModule`, `RadioButtonModule`, `MultiSelectModule`, `TextareaModule`, `CheckboxModule`, `TooltipModule`, `IconFieldModule`, `InputIconModule`, `InputTextModule`). The `.p-dialog`/`.p-dropdown` overrides in `custom-fields.scss` stay — they're global and still style PrimeNG used elsewhere in the app.
- **Browser-verified** (Playwright, prtest backend, result 8618): build green + no loop + 0 leftover PrimeNG widgets across general-information / contributor-partners / cap-dev-info. Interactive (runtime-unlocked read-only role): radio select/deselect propagates CVA value + `primary-300` fill + correct single-select grouping; checkbox toggles + `primary-300` fill; multi-select dropdown opens with `hlmInput` search (filters) + native checkboxes; tooltip appears on hover (`secondary-400`) and clears on leave. Jest: 19/19 across the 4 specs.

---

## 4. OpenSpec changes (under `openspec/changes/`)

| Change | What |
|---|---|
| `upgrade-angular-19-to-22` | The Angular platform upgrade (19→21 done; 22 blocked). |
| `install-spartan-tailwind-foundation` | Tailwind 4 + Spartan install, coexistence with PrimeNG. |
| `migrate-pr-input-pr-select-to-spartan` | First component migration (pr-input + pr-select → Spartan). |
| _(pending)_ `migrate-remaining-custom-fields-to-spartan` | pr-checkbox, pr-radio-button, pr-multi-select, pr-button → Spartan (§3.4). Code done on branch; OpenSpec change to be formalized after Yeck's OK (design-iteration exception flow). |

---

## 5. Angular 22 is blocked by PrimeNG (STOP at 21 for now)

- `primeng@22` is only a **release candidate** (`22.0.0-rc.2`), `@primeng/themes@22` **doesn't exist**, `@ncstate/sat-popover` has **no v22** (max 16 / Angular 21).
- Angular 21 already fully unblocks Spartan (`@spartan-ng/brain@1.1.0` peers Angular `>=21 <23`).
- So **Angular 22 comes AFTER PrimeNG is removed** (and sat-popover replaced, e.g. with CDK Overlay). Do not force 22 on the RC.

---

## 6. ✅ RESOLVED — hlmInput infinite change-detection loop (fix `64d68f283`)

**Symptom (was):** `result-detail/…/general-information` **looped / never loaded** — the page froze (a pure infinite CD loop, so NO console error; the browser tab just hung, which made it hard to observe).

**Root cause:** the Spartan-CLI-generated `hlmInput` directive applied `BrnInput` + `BrnFieldControlDescribedBy` host directives plus a reactive `classes()` effect. On a form-heavy page (many `pr-input` fields) under Angular 21's stricter change detection, that machinery drove an infinite change-detection loop.

**Fix:** reduced `hlmInput` (`src/app/spartan/input/src/lib/hlm-input.ts`) to a **lightweight static-class directive** — just the Spartan Tailwind classes on the host, no brain directives, no effect. PRMS already owns labels + invalid styling via its facade, so the Spartan form-field machinery isn't needed. Same look; loop gone. **Lesson:** the loop hung the browser with no error — had to reason it out from the code + verify by rebuild-and-retest (and beware a stale `ng serve` build masking the fix).

---

### Historical note (kept for context)
The original report was on the `angular-upgrade-19-22` branch and reproduced after the merge; the build was always green, so it was purely runtime.

**Prime suspect:** the Spartan **`hlmInput`** directive. It applies `BrnInput` + `BrnFieldControlDescribedBy` host directives and a `classes()` effect. On a page with many `pr-input` fields (general-information), this may trigger an infinite change-detection / effect loop or a repeated throw. (Both `BrnInput` and `BrnFieldControlDescribedBy` inject their deps as `{ optional: true }`, so it's not a missing-provider crash — more likely a CD/effect loop or an interaction with template-driven `[(ngModel)]` + `#emailInput="ngModel"`.)

**How to diagnose (do NOT infer — observe):** serve the **main checkout** (front-redesign-fields, Angular 21 — run `npm install` there first, it now needs the 21 deps), open the URL, and read the **actual console error** (Playwright MCP with the `.env` `USER_TOKEN` injected into `localStorage.token`, or the Chrome extension if reconnected). Then fix the real cause.

**Likely fix directions (once confirmed):** either wrap inputs in Spartan's form-field context, or replace the full `hlmInput` directive with a lightweight directive/class that applies only the Spartan Tailwind classes (no brain host-directives) — since our facade already handles labels/validation.

---

## 7. Also pending

- **33 Jest tests** fail on Angular 21 (dev-mode drift: NG0100 `checkNoChanges` on unstable template getters, PrimeNG Table `_Bind` harness) — not runtime bugs; need a fixing pass. See the `upgrade-angular-19-to-22` change. (The 4 custom-field specs migrated in §3.4 all pass — 19/19.)
- **hlm-button pilot** render (foundation change) — deferred.
- Migrate PrimeNG usages **outside `custom-fields/`** (pages/shared use `<p-table>`, `<p-dialog>`, `<p-select>`, etc. directly). custom-fields is now clean; the rest of the app is the next front.
- Then remove `primeng` + `@ncstate/sat-popover` entirely → **Angular 22**.
- Reconcile: `angular-upgrade-19-22` branch can be considered superseded by the merge into `front-redesign-fields`.

---

## 8. Run / build

```bash
cd onecgiar-pr-client
npm install --legacy-peer-deps   # Angular 21 + Spartan; legacy-peer-deps for the eslint/TS peer warning
npm run build:dev                # must stay green
npx ng serve --port 4200         # points at the prtest backend
```
