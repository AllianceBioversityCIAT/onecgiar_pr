import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChangeResultTypeServiceService {
  justification = '';
  otherJustification = '';
  showConfirmation = false;
  showFilters = true;
  step = 0;
}
