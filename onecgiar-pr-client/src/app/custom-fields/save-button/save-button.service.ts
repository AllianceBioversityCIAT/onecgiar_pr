import { Injectable, Injector, WritableSignal, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { tap, catchError, throwError, pipe, filter, take, defer, finalize, timeout, Subscription, MonoTypeOperatorFunction } from 'rxjs';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  /**
   * Signals (not plain booleans) so the spinner bindings react to changes directly.
   * The flags are flipped inside HTTP callbacks / Promise microtasks; on Angular 21 + Spartan
   * the implicit global CD tick that used to render a plain-boolean flip is no longer
   * guaranteed, which left the loading spinner stuck. A signal read registers a
   * reactive consumer, so CD is notified regardless of zone/scheduler timing.
   */
  isSaving = signal(false);
  isGettingSection = signal(false);

  /**
   * Safety net for {@link isCreatingPipe}: if a "create" response never triggers a navigation
   * (e.g. the caller stays on the same page) the button is released anyway.
   */
  private static readonly CREATING_HOLD_TIMEOUT_MS = 15000;

  /**
   * Ceiling for a save request.
   *
   * ⚠️ There is no HTTP timeout anywhere in the client's interceptors, and these pipes only clear
   * the spinner on `next` or on `error`. A request that the server accepts and then never answers
   * — exactly what a backend stall produces — left the button reading "Saving…", disabled, for
   * ever: no error, no recovery, and the only way out was reloading and losing the work.
   *
   * `timeout` turns that silence into a `TimeoutError`, which the existing `catchError` below
   * already handles: spinner released, error toast shown, the user can retry.
   */
  private static readonly SAVE_TIMEOUT_MS = 60000;

  /**
   * How long {@link saveAndSettle} waits for a triggered save to actually reach the network.
   * Most section handlers issue their PATCH synchronously (`isSavingPipe` raises the flag while
   * the pipe is built), but three do not: evidences uploads its files first, Innovation dev info
   * awaits its own evidence call, and Innovation use re-reads the stored link before patching.
   */
  private static readonly SAVE_START_WINDOW_MS = 1000;

  /**
   * Grace period after the spinner goes back down with no settled save, before
   * {@link saveAndSettle} concludes that nothing was actually sent. Without it a handler that
   * raises and lowers the spinner around local work (evidences does exactly that while uploading)
   * would hold the caller until the full save timeout.
   */
  private static readonly SAVE_SETTLE_GRACE_MS = 500;

  /** Poll step of the two waits above. */
  private static readonly SAVE_POLL_MS = 25;

  /**
   * Monotonic count of SETTLED saves, and how the last one ended.
   *
   * `isSaving` alone cannot answer "did the save the user just triggered succeed?": it is a single
   * shared flag that goes up and down, so a caller that watches it sees the same value for
   * "finished fine" and "failed". The counter gives every settle a distinct identity, which is what
   * {@link saveAndSettle} compares against its own baseline.
   */
  private readonly settledSaves = signal(0);
  private lastSaveSucceeded = true;

  private creatingNavSub: Subscription | null = null;
  private creatingHoldId: any = null;

  /** Resolved lazily so the Router is never instantiated just to construct this service (tests). */
  private readonly injector = inject(Injector);

  constructor(private customizedAlertsFeSE: CustomizedAlertsFeService) {}

  /** Parses Nest/Angular HTTP error bodies for a user-facing message. */
  private extractHttpErrorMessage(err: unknown): string {
    const body = (err as { error?: { message?: unknown } })?.error;
    if (body == null || typeof body !== 'object') {
      return '';
    }
    const msg = (body as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
    if (Array.isArray(msg)) {
      return msg
        .filter((m): m is string => typeof m === 'string')
        .map(m => m.trim())
        .filter(Boolean)
        .join('. ');
    }
    return '';
  }
  showSaveSpinner() {
    this.isSaving.set(true);
  }
  hideSaveSpinner() {
    this.releaseCreatingHold();
    this.isSaving.set(false);
  }

  /**
   * Per-surface in-flight tracking for save/submit buttons that are NOT the single fixed save bar
   * (modal, drawer, inline icon action).
   *
   * `isSaving` is ONE root signal shared by the whole app: binding it inside a dialog would spin
   * every other save button on screen and give contradictory feedback. Those surfaces own a local
   * signal each and hand it here, so the lifecycle bookkeeping lives in one place instead of being
   * re-written (and half-forgotten) per component.
   *
   * `defer` flips the flag on SUBSCRIBE, so a piped-but-never-subscribed observable cannot leave a
   * button dead; `finalize` clears it on success, on error AND on unsubscribe — the error branch is
   * the one that was consistently missed by hand-written flags.
   *
   * Note it does NOT touch `isSaving` and raises no global toast: those belong to the fixed save
   * bar and would double-report next to the surface's own feedback.
   */
  inFlightPipe<T = any>(flag: WritableSignal<boolean>): MonoTypeOperatorFunction<T> {
    return source =>
      defer(() => {
        flag.set(true);
        return source;
      }).pipe(finalize(() => flag.set(false)));
  }

  /**
   * `async/await` counterpart of {@link inFlightPipe} for handlers built on promises.
   * The rejection still propagates — only the flag is guaranteed to be released.
   */
  async runInFlight<T>(flag: WritableSignal<boolean>, work: () => Promise<T>): Promise<T> {
    flag.set(true);
    try {
      return await work();
    } finally {
      flag.set(false);
    }
  }

  isGettingSectionPipe<T = any>(): MonoTypeOperatorFunction<T> {
    Promise.resolve().then(() => {
      this.isGettingSection.set(true);
    });
    return pipe(
      tap(resp => {
        Promise.resolve().then(() => {
          this.isGettingSection.set(false);
        });
      }),
      catchError(err => {
        Promise.resolve().then(() => {
          this.isGettingSection.set(false);
        });
        return throwError(() => err);
      })
    );
  }

  isSavingPipe<T = any>(): MonoTypeOperatorFunction<T> {
    this.showSaveSpinner();
    const settle = this.settleOnce();
    return pipe(
      timeout({ each: SaveButtonService.SAVE_TIMEOUT_MS }),
      tap(resp => {
        this.hideSaveSpinner();
        settle(true);
        this.customizedAlertsFeSE.show({ id: 'save-button', title: 'Section saved successfully', description: '', status: 'success', closeIn: 500 });
      }),
      catchError(err => {
        this.hideSaveSpinner();
        settle(false);
        const detail = this.extractHttpErrorMessage(err);
        this.customizedAlertsFeSE.show({
          id: 'save-button',
          title: 'There was an error saving the section',
          description: detail,
          status: 'error',
          ...(detail ? {} : { closeIn: 500 })
        });
        return throwError(() => err);
      })
    );
  }

  isSavingPipeNextStep<T = any>(nextPrevious: string): MonoTypeOperatorFunction<T> {
    const decrip = `Redirecting to the ` + nextPrevious + ` step`;
    this.showSaveSpinner();
    const settle = this.settleOnce();
    return pipe(
      timeout({ each: SaveButtonService.SAVE_TIMEOUT_MS }),
      tap(resp => {
        this.hideSaveSpinner();
        settle(true);
        this.customizedAlertsFeSE.show({
          id: 'save-button',
          title: 'Section saved successfully',
          description: decrip,
          status: 'success',
          closeIn: 500
        });
      }),
      catchError(err => {
        this.hideSaveSpinner();
        settle(false);
        const detail = this.extractHttpErrorMessage(err);
        this.customizedAlertsFeSE.show({
          id: 'save-button',
          title: 'There was an error saving the section',
          description: detail,
          status: 'error',
          ...(detail ? {} : { closeIn: 500 })
        });
        return throwError(() => err);
      })
    );
  }

  isCreatingPipe<T = any>(): MonoTypeOperatorFunction<T> {
    this.showSaveSpinner();
    return pipe(
      tap(() => {
        // Do NOT clear the spinner here. `tap` runs BEFORE the subscriber navigates to the
        // freshly created result, so clearing it now produces the reported bug: the button
        // goes idle, then the destination route renders empty while it resolves its own data
        // — a blank gap that reads as "nothing is happening". Keep the creating state alive
        // until the router actually lands on the destination.
        this.holdCreatingUntilNavigation();
      }),
      catchError(err => {
        this.hideSaveSpinner();
        return throwError(() => err);
      })
    );
  }

  /**
   * One settle per piped request, first answer wins.
   *
   * 🛑 The `tap` raises the success toast AFTER recording the outcome, and `show()` reaches into the
   * DOM (`customized-alerts-fe.service.ts` appends to `app-root`) — if it throws, RxJS routes that
   * throw into this pipe's own `catchError`, which would then overwrite a save the server had
   * already accepted with `failed` and strand the user on a section that saved fine.
   */
  private settleOnce(): (ok: boolean) => void {
    let settled = false;
    return (ok: boolean) => {
      if (settled) return;
      settled = true;
      this.lastSaveSucceeded = ok;
      this.settledSaves.update(count => count + 1);
    };
  }

  /**
   * Runs `trigger` — a handler that is expected to save — and resolves with what happened to that
   * save, so a caller can decide whether it is safe to move on.
   *
   * Exists for `Next` in the result-detail wizard (P2-3659 / P2-3654): navigating away used to
   * discard everything typed in the open section, because only `Save draft` ever issued the
   * section's PATCH. Waiting on the outcome — instead of firing and navigating — is what keeps the
   * user on the section when the server rejects the save, with the error toast still on screen.
   *
   * Returns:
   * - `saved` — a save settled successfully;
   * - `failed` — a save settled with an error;
   * - `not-started` — nothing reached the network: the handler returned early on its own guard, it
   *   opened a confirmation modal, or it only did local work. The caller should then behave exactly
   *   as it did before this method existed. 🛑 Never report `failed` for this case: a section with
   *   no save path of its own would otherwise trap the user in it.
   */
  async saveAndSettle(trigger: () => void): Promise<'saved' | 'failed' | 'not-started'> {
    const baseline = this.settledSaves();
    trigger();

    const started = await this.waitUntil(
      () => this.isSaving() || this.settledSaves() !== baseline,
      SaveButtonService.SAVE_START_WINDOW_MS
    );
    if (!started) return 'not-started';

    if (!(await this.waitForSettle(baseline))) return 'not-started';
    return this.lastSaveSucceeded ? 'saved' : 'failed';
  }

  /**
   * Waits for a save to settle, giving up when the spinner has been down for
   * {@link SAVE_SETTLE_GRACE_MS} without one — a handler can raise and lower it around local work
   * (evidences does, while uploading its files) and never issue a piped request.
   */
  private async waitForSettle(baseline: number): Promise<boolean> {
    const deadline = Date.now() + SaveButtonService.SAVE_TIMEOUT_MS + SaveButtonService.SAVE_START_WINDOW_MS;
    let idleSince: number | null = null;

    while (Date.now() < deadline) {
      if (this.settledSaves() !== baseline) return true;
      if (this.isSaving()) {
        idleSince = null;
      } else {
        idleSince ??= Date.now();
        if (Date.now() - idleSince >= SaveButtonService.SAVE_SETTLE_GRACE_MS) return false;
      }
      await this.nextPoll();
    }
    return false;
  }

  private waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    const poll = async (): Promise<boolean> => {
      while (!predicate()) {
        if (Date.now() >= deadline) return false;
        await this.nextPoll();
      }
      return true;
    };
    return poll();
  }

  private nextPoll(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, SaveButtonService.SAVE_POLL_MS));
  }

  /** Keeps `isSaving` on until the next navigation settles (or the safety timeout fires). */
  private holdCreatingUntilNavigation(): void {
    this.releaseCreatingHold();

    const router = this.injector.get(Router, null);
    if (!router) {
      this.isSaving.set(false);
      return;
    }

    this.creatingNavSub = router.events
      .pipe(
        filter(event => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
        take(1)
      )
      .subscribe(() => this.hideSaveSpinner());

    this.creatingHoldId = setTimeout(() => this.hideSaveSpinner(), SaveButtonService.CREATING_HOLD_TIMEOUT_MS);
  }

  private releaseCreatingHold(): void {
    this.creatingNavSub?.unsubscribe();
    this.creatingNavSub = null;
    if (this.creatingHoldId !== null) {
      clearTimeout(this.creatingHoldId);
      this.creatingHoldId = null;
    }
  }
}
