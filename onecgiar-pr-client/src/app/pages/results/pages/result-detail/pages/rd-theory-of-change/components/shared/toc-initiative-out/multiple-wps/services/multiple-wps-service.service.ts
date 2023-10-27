import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MultipleWPsServiceService {
  showMultipleWPsContent = true;
  activeTab: any = null;

  constructor() {}
}
