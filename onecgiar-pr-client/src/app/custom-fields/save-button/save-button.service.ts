import { Injectable } from '@angular/core';
import { tap, catchError, retry, throwError, pipe } from 'rxjs';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  isSaving = false;
  isGettingSection = false;
  constructor(private customizedAlertsFeSE: CustomizedAlertsFeService) {}
  showSaveSpinner() {
    this.isSaving = true;
  }
  hideSaveSpinner() {
    this.isSaving = false;
  }

  isGettingSectionPipe(): any {
    Promise.resolve().then(() => {
      this.isGettingSection = true;
    });
    // this.cd.detectChanges();
    return pipe(
      tap(resp => {
        Promise.resolve().then(() => {
          this.isGettingSection = false;
        });
      }),
      catchError(err => {
        Promise.resolve().then(() => {
          this.isGettingSection = false;
        });
        return throwError(() => err);
      })
      // ,retry(1)
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
        this.customizedAlertsFeSE.show({
          id: 'save-button',
          title: 'There was an error saving the section',
          description: '',
          status: 'error',
          closeIn: 500
        });
        return throwError(() => err);
      })
      // ,retry(1)
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
        this.customizedAlertsFeSE.show({
          id: 'save-button',
          title: 'There was an error saving the section',
          description: '',
          status: 'error',
          closeIn: 500
        });
        return throwError(() => err);
      })
      // ,retry(1)
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
      // ,retry(1)
    );
  }
}
