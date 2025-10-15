import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

export interface Score {
  id: string;
  name: string;
  impact_area: string;
  created_date: Date;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GetImpactAreasScoresService {
  api = inject(ApiService);

  genderTagScoreList = signal<Score[]>([]);
  climateTagScoreList = signal<Score[]>([]);
  nutritionTagScoreList = signal<Score[]>([]);
  environmentalBiodiversityTagScoreList = signal<Score[]>([]);
  povertyTagScoreList = signal<Score[]>([]);

  constructor() {
    this.api.resultsSE.GET_impactAreasScoresComponentsAll().subscribe(({ response }) => {
      this.genderTagScoreList.set(response.filter(item => item.impact_area === 'Gender'));
      this.climateTagScoreList.set(response.filter(item => item.impact_area === 'Climate'));
      this.nutritionTagScoreList.set(response.filter(item => item.impact_area === 'Nutrition'));
      this.environmentalBiodiversityTagScoreList.set(response.filter(item => item.impact_area === 'Environmental'));
      this.povertyTagScoreList.set(response.filter(item => item.impact_area === 'Poverty'));
    });
  }
}
