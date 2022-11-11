import { Injectable } from '@angular/core';
import { tap, catchError, retry, throwError, pipe } from 'rxjs';
import { ApiService } from '../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../shared/services/customized-alerts-fe.service';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  isSaving = false;
  constructor(private customizedAlertsFeSE: CustomizedAlertsFeService) {}
  showSaveSpinner() {
    this.isSaving = true;
  }
  hideSaveSpinner() {
    this.isSaving = false;
  }

  isSavingPipe(): any {
    this.showSaveSpinner();
    return pipe(
      tap(resp => {
        this.hideSaveSpinner();
        this.customizedAlertsFeSE.show({ id: 'sectionSaved', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
      }),
      catchError(err => {
        this.hideSaveSpinner();
        this.customizedAlertsFeSE.show({ id: 'sectionSaved', title: 'There was an error saving the section', description: '', status: 'error', closeIn: 500 });
        return throwError(err);
      })
      // ,retry(1)
    );
  }
}
