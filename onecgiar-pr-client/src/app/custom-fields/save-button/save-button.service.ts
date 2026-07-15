import { Injectable, signal } from '@angular/core';
import { tap, catchError, throwError, pipe } from 'rxjs';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  isSaving = false;
  /**
   * Signal (not a plain boolean) so the spinner *ngIf reacts to changes directly.
   * The flag is flipped inside a Promise microtask; on Angular 21 + Spartan the
   * implicit global CD tick that used to render a plain-boolean flip is no longer
   * guaranteed, which left the loading spinner stuck. A signal read registers a
   * reactive consumer, so CD is notified regardless of zone/scheduler timing.
   */
  isGettingSection = signal(false);
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
    this.isSaving = true;
  }
  hideSaveSpinner() {
    this.isSaving = false;
  }

  isGettingSectionPipe(): any {
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

  isSavingPipe(): any {
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

  isSavingPipeNextStep(nextPrevious: string): any {
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

  isCreatingPipe(): any {
    this.showSaveSpinner();
    return pipe(
      tap(resp => {
        this.hideSaveSpinner();
      }),
      catchError(err => {
        this.hideSaveSpinner();
        return throwError(() => err);
      })
    );
  }
}
