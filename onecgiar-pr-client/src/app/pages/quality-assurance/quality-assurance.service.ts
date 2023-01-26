import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QualityAssuranceService {
  $qaFirstInitObserver = null;
  constructor() {}
}
