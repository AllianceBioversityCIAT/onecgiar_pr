import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavigationBarService } from '../../../../shared/services/navigation-bar.service';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-result-detail',
  templateUrl: './result-detail.component.html',
  styleUrls: ['./result-detail.component.scss']
})
export class ResultDetailComponent {
  constructor(public navigationBarSE: NavigationBarService, private activatedRoute: ActivatedRoute, private api: ApiService) {}
  ngOnInit(): void {
    this.api.resultsSE.currentResultId = this.activatedRoute.snapshot.paramMap.get('id');
  }
}
