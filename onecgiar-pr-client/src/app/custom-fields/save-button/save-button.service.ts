import { Injectable, Injector, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { tap, catchError, throwError, pipe, filter, take, Subscription, MonoTypeOperatorFunction } from 'rxjs';
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
