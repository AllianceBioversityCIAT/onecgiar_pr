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
    return pipe(
      timeout({ each: SaveButtonService.SAVE_TIMEOUT_MS }),
      tap(resp => {
        this.hideSaveSpinner();
        this.customizedAlertsFeSE.show({ id: 'save-button', title: 'Section saved successfully', description: '', status: 'success', closeIn: 500 });
      }),
      catchError(err => {
        this.hideSaveSpinner();
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
    return pipe(
      timeout({ each: SaveButtonService.SAVE_TIMEOUT_MS }),
      tap(resp => {
        this.hideSaveSpinner();
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
