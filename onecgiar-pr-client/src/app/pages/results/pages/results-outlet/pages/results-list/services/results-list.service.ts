import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResultsListService {
  showDeletingResultSpinner = false;
  showLoadingResultSpinner = false;
  constructor() {}
}
