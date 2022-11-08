import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Score } from '../../interfaces/score.interface';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  genderTagScoreList: Score[] = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_allGenderTag().subscribe(({ response }) => {
      this.genderTagScoreList = response;
    });
  }
}
