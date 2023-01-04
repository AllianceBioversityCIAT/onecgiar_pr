import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { ResultLevelService } from '../results/pages/result-creator/services/result-level.service';

@Component({
  selector: 'app-quality-assurance',
  templateUrl: './quality-assurance.component.html',
  styleUrls: ['./quality-assurance.component.scss']
})
export class QualityAssuranceComponent implements OnInit {
  constructor(public api: ApiService, public resultLevelSE: ResultLevelService) {}
  allInitiatives = [];
  ngOnInit(): void {
    this.GET_AllInitiatives();
  }

  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      console.log(response);
      this.allInitiatives = response;
    });
  }
}
