import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { HlmButton } from '@spartan/button';
import { ApiService } from '../../../../shared/services/api/api.service';
import { toNullableBoolean } from '../../../../shared/utils/nullable-boolean.util';
import {
  AnnualUpdatingContext,
  AnnualUpdatingGeneralInfoBody,
  RdAnnualUpdatingComponent,
} from '../../../../shared/components/annual-updating/rd-annual-updating.component';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsFieldItem } from '../../services/bilateral-mds-tracker.service';
import { BilateralMarkDiscontinuedDialogService } from './bilateral-mark-discontinued-dialog.service';

/**
 * Duplicated from the shared component's own private constants (`rd-annual-updating.component.ts`)
 * on purpose: recognised by TEXT, never by id, same reasoning as that component — the 2026
 * catalogue rows are AUTO_INCREMENT, so no literal id can be relied on. Not exported from the
 * shared component because widening its public surface for a naming-only match is not this task's
 * scope; if a third caller ever needs this, promote it then.
 */
const MERGE_REASON_TEXT = 'Discontinued: merging with another innovation';
const SPLIT_REASON_TEXT = 'Discontinued: splitting into multiple innovations';

/** The legacy "Other" row, recognised by id because the catalogue never flagged it (P2-3292). */
const LEGACY_OTHER_OPTION_ID = 6;

/**
 * BIL-RAU-T-8 (design.md §6.2) — the bilateral wrapper that mounts the shared Annual updating block
 * in Section 1 for replicated Innovation Development (7) / Innovation Use (2) results.
 *
 * - **Load**: fetches the reasons catalogue and merges in the stored answer/reasons/targets from
 *   `BilateralCreationService`. `loaded` follows the P2-3556 `signal<boolean|null>(null)` pattern.
 * - **Yes** (`is_discontinued` becomes `false`, from the radio or admin Reopen): stages the Yes
 *   batch and flushes immediately — there is no periodic autosave timer in this codebase's
 *   `BilateralAutoSaveService` (flush only runs from Save draft / Next / Back), so "autosaves" here
 *   means "stage, then flush", the same shape every other `generalInfo` field uses via explicit
 *   navigation, brought forward so the status transition (R-4) does not wait on an unrelated action.
 * - **No** (`is_discontinued` stays `true`): nothing is staged; only the derived UI (warning, confirm
 *   button, MDS items) is recomputed. `openMarkDiscontinuedDialog()` is the only path that stages
 *   the discontinuation batch (R-11, DD-3).
 *
 * See the folder's `CLAUDE.md` for the full contract, the save-response hook, and the disqualifier
 * check (no import from `pages/results/`).
 */
@Component({
  selector: 'app-bilateral-annual-updating',
  standalone: true,
  imports: [CustomFieldsModule, RdAnnualUpdatingComponent, HlmButton],
  templateUrl: './bilateral-annual-updating.component.html',
  styleUrl: './bilateral-annual-updating.component.scss',
})
export class BilateralAnnualUpdatingComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly autoSaveService = inject(BilateralAutoSaveService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly markDiscontinuedDialog = inject(BilateralMarkDiscontinuedDialogService);

  /** P2-3556 pattern: `null` while the catalogue is in flight, `true`/`false` once it settles. */
  readonly loaded = signal<boolean | null>(null);
  readonly confirming = signal(false);
  readonly saveError = signal<string | null>(null);

  /**
   * Mutated in place by the shared `app-rd-annual-updating` component (same contract W1/W2 uses).
   * Set once, by `loadCatalogue()`, before the child ever mounts (gated by `loaded() === true` in
   * the template), so the child's `ngOnChanges` never sees this reference change.
   */
  generalInfoBody: AnnualUpdatingGeneralInfoBody = { discontinued_options: [], merge_split_targets: [] };

  /**
   * BIL-RAU-T-8 (design.md §6.2) — the bilateral substitute for `dataControlSE.currentResult` /
   * `rolesSE.*` / `isPhaseOpen`. A `computed()`, never a getter or an inline template literal: the
   * shared component's `CLAUDE.md` documents that a fresh reference on every change-detection tick
   * rebuilds `options` in its `ngOnChanges` and risks NG0103. `computed()` only recomputes (and
   * therefore only returns a new reference) when a read dependency actually changes.
   */
  readonly context = computed<AnnualUpdatingContext>(() => {
    // Every signal read unconditionally, into a local, BEFORE any `&&`/`||` short-circuit uses it —
    // same discipline as the exemption `effect` in `bilateral-result-creator.component.ts`. Reading
    // `resultStatusId()` only on the right of `isEditableByCenterUser() || (isAdmin && …)` would let
    // Angular's dependency tracking skip it entirely whenever the left side is `true` (or `isAdmin`
    // is `false`) on the run that "discovers" this computed's producers — and a `computed()` never
    // re-evaluates for a signal it never registered as a dependency, so `editable` could freeze
    // stale forever the next time `resultStatusId` changes alone.
    const resultId = this.creationService.currentResultId() ?? undefined;
    const resultTypeId = this.creationService.resultTypeId() ?? undefined;
    const phaseYear = this.creationService.reportingYear() ?? undefined;
    const storedIsDiscontinued = this.creationService.storedIsDiscontinued();
    const isEditableByCenterUser = this.creationService.isEditableByCenterUser();
    const resultStatusId = this.creationService.resultStatusId();
    const isAdmin = this.api.rolesSE.isAdmin;
    const isReadOnly = this.autoSaveService.isReadOnly();

    return {
      resultId,
      resultTypeId,
      phaseYear,
      storedIsDiscontinued,
      isAdmin,
      // R2B-1 — a non-admin also needs the editor's "may edit at all" lock down (lead-centre Center User);
      // for a non-admin `isReadOnly` = !editable || !canEdit, so it folds both. Admin keeps the Discontinued escape.
      editable: isAdmin ? isEditableByCenterUser || resultStatusId === 4 : isEditableByCenterUser && !isReadOnly,
    };
  });

  constructor() {
    // design.md §6.2: "on the save response call creationService.setResultStatus(status_id)".
    // `lastGeneralInfoResponse` only ever carries `status_id` for a discontinuation save (see the
    // hook's doc comment in `BilateralAutoSaveService`), so this effect is a no-op for every other
    // `generalInfo` field's save (Title, DAC tags, …).
    //
    // Reviewer Issue 3 (attempt 2): the signal is creator-scoped (per `BilateralAutoSaveService`
    // instance, provided once per editor visit), not per-result — `reset()` now clears it (see
    // that service), but a response already stored survives until the NEXT save on this same
    // service instance, and this effect runs once on construction, before any such next save. A
    // route-param change / `retryLoadResult()` / `reloadAfterResultTypeChange()` calls `reset()`
    // then remounts the sections, so the wrapper for the NEW result could otherwise read the OLD
    // result's stale `status_id` the instant it is created (the in-flight `_generation` guard
    // inside the service does not help here: the value was already stored before the reset). The
    // `response.id === currentResultId()` check is what actually closes the race for THIS effect;
    // clearing the signal in `reset()` is the other half, for a wrapper that never re-reads it.
    effect(() => {
      const response = this.autoSaveService.lastGeneralInfoResponse();
      if (!response) return;
      if (Number(response['id']) !== Number(this.creationService.currentResultId())) return;

      const statusId = response['status_id'];
      if (statusId !== undefined && statusId !== null) {
        this.creationService.setResultStatus(Number(statusId));
      }
      // Advisory (Reviewer, attempt 2): keep the lock/Reopen gate current without a reload. The
      // response carries `is_discontinued` on the same discontinuation save that carries
      // `status_id`, and we are already inside the one effect that reads this response.
      if ('is_discontinued' in response) {
        this.creationService.storedIsDiscontinued.set(response['is_discontinued'] as boolean | number | null);
      }
    });
  }

  ngOnInit(): void {
    this.loadCatalogue();
  }

  ngOnDestroy(): void {
    // `section-general-info` already clears the `'annual-updating'` MDS group when it stops
    // rendering this wrapper (it owns the `@if`) — this covers the wrapper's own destroy path too.
    this.mdsTracker.setSectionFields('general-info', [], 'annual-updating');
  }

  private loadCatalogue(): void {
    this.loaded.set(null);
    const typeId = this.creationService.resultTypeId();
    const phaseYear = this.creationService.reportingYear() ?? undefined;

    this.api.resultsSE.GET_investmentDiscontinuedOptions(typeId, phaseYear).subscribe({
      next: ({ response }: { response: any[] }) => {
        const stored = this.creationService.storedDiscontinuedOptions() ?? [];
        const merged = (response ?? []).map((option: any) => {
          const found = stored.find(
            (s: any) => Number(s.investment_discontinued_option_id) === Number(option.investment_discontinued_option_id)
          );
          return found
            ? { ...option, value: true, description: found.description ?? null }
            : { ...option, value: false, description: null };
        });
        const storedTargets = (this.creationService.storedMergeSplitTargets() ?? []).map((target: any) => ({
          target_result_id: Number(target.target_result_id),
          transition_type: target.transition_type,
        }));

        this.generalInfoBody = {
          // Same as `rd-general-information.component.ts:237` — the endpoint answers the MySQL
          // tinyint, never a boolean.
          is_discontinued: toNullableBoolean(this.creationService.storedIsDiscontinued()) as any,
          discontinued_options: merged,
          merge_split_targets: storedTargets,
        };
        this.loaded.set(true);
        this.updateMdsItems();
      },
      error: () => {
        this.loaded.set(false);
      },
    });
  }

  /** Fires after every mutation the shared component makes (radio, reason, "Other", targets, Reopen). */
  onAnswerChange(): void {
    if (this.loaded() !== true) return;
    if (this.generalInfoBody.is_discontinued === false) {
      this.stageYesAndFlush();
    }
    this.updateMdsItems();
  }

  private stageYesAndFlush(): void {
    this.saveError.set(null);
    this.autoSaveService.updateFieldsBatch({
      is_discontinued: false,
      discontinued_options: [],
      merge_split_targets: [],
    });
    void this.autoSaveService.flush(['generalInfo']);
  }

  private isReasonTicked(text: string): boolean {
    return (this.generalInfoBody.discontinued_options ?? []).some(
      (option: any) => option?.value === true && (option?.option ?? '').trim() === text
    );
  }

  private needsDescription(option: any): boolean {
    if (option?.requires_description != null) return !!option.requires_description;
    return Number(option?.investment_discontinued_option_id) === LEGACY_OTHER_OPTION_ID;
  }

  private targetsFor(type: 'merge' | 'split'): number {
    return (this.generalInfoBody.merge_split_targets ?? []).filter(target => target.transition_type === type).length;
  }

  /**
   * R-11 (S-11.1, S-11.3): complete = at least one reason, its description when required, and a
   * target per ticked merge/split reason.
   *
   * Reviewer Issue 5 (attempt 2): also gated on `context().editable`. Without it, a non-admin on a
   * result already locked (stored No at status 4) saw an enabled button that opened the dialog and
   * then had its batch silently dropped by the read-only gate — "the screen lies" (P2-3520 class).
   */
  canConfirmDiscontinuation(): boolean {
    if (!this.context().editable) return false;
    if (this.generalInfoBody.is_discontinued !== true) return false;
    const ticked = (this.generalInfoBody.discontinued_options ?? []).filter((option: any) => option?.value === true);
    if (ticked.length === 0) return false;
    if (ticked.some((option: any) => this.needsDescription(option) && !String(option?.description ?? '').trim())) return false;
    if (this.isReasonTicked(MERGE_REASON_TEXT) && this.targetsFor('merge') === 0) return false;
    if (this.isReasonTicked(SPLIT_REASON_TEXT) && this.targetsFor('split') === 0) return false;
    return true;
  }

  /** S-11.3 (owner decision 2026-09-29): visible the moment No is picked with zero reasons ticked. */
  showsNoReasonWarning(): boolean {
    if (this.generalInfoBody.is_discontinued !== true) return false;
    return !(this.generalInfoBody.discontinued_options ?? []).some((option: any) => option?.value === true);
  }

  /** Reviewer Issue 5: return early on a locked block, same gate `canConfirmDiscontinuation()` applies. */
  openMarkDiscontinuedDialog(): void {
    if (!this.context().editable || !this.canConfirmDiscontinuation() || this.confirming()) return;
    this.markDiscontinuedDialog.open().subscribe(result => {
      if (result === 'confirm') void this.confirmDiscontinuation();
    });
  }

  /**
   * Upper bound for `waitForSave()`'s poll — mirrors `bilateral-result-creator.component.ts`'s
   * `MANUAL_SAVE_TIMEOUT_MS`, so a stuck request can never freeze `confirming` forever.
   */
  private static readonly SAVE_TIMEOUT_MS = 15000;

  private async confirmDiscontinuation(): Promise<void> {
    this.confirming.set(true);
    this.saveError.set(null);

    const reasons = (this.generalInfoBody.discontinued_options ?? [])
      .filter((option: any) => option?.value === true)
      .map((option: any) => ({
        investment_discontinued_option_id: Number(option.investment_discontinued_option_id),
        is_active: true,
        description: option.description ?? null,
      }));
    const targets = (this.generalInfoBody.merge_split_targets ?? []).map(target => ({
      target_result_id: Number(target.target_result_id),
      transition_type: target.transition_type,
    }));

    this.autoSaveService.updateFieldsBatch({
      is_discontinued: true,
      discontinued_options: reasons,
      merge_split_targets: targets,
    });
    // Reviewer Issue 2 (attempt 2): `flush()` only DISPATCHES the request — `enqueueEndpointRequest`
    // subscribes and returns immediately, so the returned promise resolves before the PATCH
    // answers, not after. Reading `hasErrorFor('general-info')` right after `await flush(...)`
    // therefore always saw `'saving'`, never `'error'`, and the T-6 400 ("Please provide a
    // reason.") never reached `saveError()` outside a mock that faked the timing. `waitForSave()`
    // polls `hasPendingFor` the same way `bilateral-result-creator.component.ts`'s
    // `waitForSectionSave()` already does for the identical reason.
    await this.autoSaveService.flush(['generalInfo']);
    await this.waitForSave();

    this.confirming.set(false);
    if (this.autoSaveService.hasErrorFor('general-info')) {
      this.saveError.set(this.autoSaveService.lastErrorMessageFor('general-info') ?? 'Could not save. Please try again.');
    }
  }

  /**
   * Polls until the `generalInfo` request settles (saved or errored), or the timeout elapses.
   *
   * Reviewer Issue 2 (attempt 3): `hasPendingFor` counts a field status of `'error'` as pending
   * (`bilateral-auto-save.service.ts`'s `hasPendingFor`: `'dirty' || 'saving' || 'error'`), because
   * for every OTHER caller "pending" means "still unsaved, including a failed save the user hasn't
   * retried" — that's the right reading for a save-status badge. It is the wrong reading for a
   * one-shot wait that exists ONLY to know when it is safe to read `hasErrorFor`: without the extra
   * `&& !hasErrorFor(...)` exit, a real 400 never breaks the loop and this polls the full
   * `SAVE_TIMEOUT_MS` before showing "Please provide a reason." — the exact trap
   * `bilateral-result-creator.component.ts`'s `waitForSectionSave()` already carries this same
   * extra exit for (`hasErrorFor` check inline, not a named constant). Mirrored here.
   */
  private async waitForSave(): Promise<void> {
    const start = Date.now();
    while (
      this.autoSaveService.hasPendingFor('general-info') &&
      !this.autoSaveService.hasErrorFor('general-info') &&
      Date.now() - start < BilateralAnnualUpdatingComponent.SAVE_TIMEOUT_MS
    ) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private updateMdsItems(): void {
    const body = this.generalInfoBody;
    const answered = body.is_discontinued === true || body.is_discontinued === false;
    const items: MdsFieldItem[] = [{ key: 'annual-update', label: 'Annual update', filled: answered }];

    if (body.is_discontinued === true) {
      const anyTicked = (body.discontinued_options ?? []).some((option: any) => option?.value === true);
      items.push({ key: 'annual-update-reasons', label: 'Reason for discontinuation', filled: anyTicked });

      if (this.isReasonTicked(MERGE_REASON_TEXT) || this.isReasonTicked(SPLIT_REASON_TEXT)) {
        items.push({
          key: 'annual-update-targets',
          label: 'Merge/split target',
          filled: (body.merge_split_targets ?? []).length > 0,
        });
      }
    }

    this.mdsTracker.setSectionFields('general-info', items, 'annual-updating');
  }
}
