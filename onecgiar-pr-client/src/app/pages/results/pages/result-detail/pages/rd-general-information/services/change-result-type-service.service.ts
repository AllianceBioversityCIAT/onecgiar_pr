import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChangeResultTypeServiceService {
  justification = '';
  otherJustification = '';
  showConfirmation = false;
  step = 0;

  constructor() {}
}
