import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-phase-switcher',
  templateUrl: './phase-switcher.component.html',
  styleUrls: ['./phase-switcher.component.scss']
})
export class PhaseSwitcherComponent implements OnInit {
  resultPhaseList = [];
  constructor(private api: ApiService, private router: Router, public activatedRoute: ActivatedRoute) {}

  ngOnInit(): void {
    console.log(this.activatedRoute.snapshot.queryParams);
    this.api.resultsSE.GET_versioningResult().subscribe(({ response }) => {
      console.log(response);
      this.resultPhaseList = response;
    });
  }

  goToresultUrl(phaseId) {
    this.router.navigate(['/result/result-detail/554/general-information'], { queryParams: { phaseId } }).then(() => {
      window.location.reload();
    });
  }
}
