import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class GetImpactAreasScoresService {
  api = inject(ApiService);
  impactAreasScoresComponents = signal<any[]>([]);
  constructor() {
    console.log('constructor');
    console.clear();
    this.api.resultsSE.GET_impactAreasScoresComponentsAll().subscribe(({ response }) => {
      this.impactAreasScoresComponents.set(response);
      console.log(response);
    });
  }
}
