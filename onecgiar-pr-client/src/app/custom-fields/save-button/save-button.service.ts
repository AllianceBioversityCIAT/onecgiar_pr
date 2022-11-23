import { Injectable } from '@angular/core';
import { tap, catchError, retry, throwError, pipe } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  isSaving = false;
  isSavingSection = false;
  constructor(private customizedAlertsFeSE: CustomizedAlertsFeService) {}
  showSaveSpinner() {
    this.isSaving = true;
  }
  hideSaveSpinner() {
    this.isSaving = false;
  }

  isSavingSectionPipe(): any {
    Promise.resolve().then(() => {
      this.isSavingSection = true;
    });
    // this.cd.detectChanges();
    return pipe(
      tap(resp => {
        Promise.resolve().then(() => {
          this.isSavingSection = false;
        });
      }),
      catchError(err => {
        Promise.resolve().then(() => {
          this.isSavingSection = false;
        });
        return throwError(err);
      })
      // ,retry(1)
    );
  }

  isSavingPipe(): any {
    this.showSaveSpinner();
    return pipe(
      tap(resp => {
        this.hideSaveSpinner();
        this.customizedAlertsFeSE.show({ id: 'save-button', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
      }),
      catchError(err => {
        this.hideSaveSpinner();
        this.customizedAlertsFeSE.show({ id: 'save-button', title: 'There was an error saving the section', description: '', status: 'error', closeIn: 500 });
        return throwError(err);
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
        return throwError(err);
      })
      // ,retry(1)
    );
  }
}
