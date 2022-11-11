import { Injectable } from '@angular/core';
import { tap, catchError, retry, throwError, pipe } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SaveButtonService {
  isSaving = false;
  constructor() {}
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
        console.log(resp);
        this.hideSaveSpinner();
      }),
      catchError(err => {
        console.log('error');
        this.hideSaveSpinner();
        return throwError('This is a custom error!');
      }),
      retry(1)
    );
  }
}
