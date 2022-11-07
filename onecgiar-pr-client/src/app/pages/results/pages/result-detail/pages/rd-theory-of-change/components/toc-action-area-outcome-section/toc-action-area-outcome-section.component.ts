import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-toc-action-area-outcome-section',
  templateUrl: './toc-action-area-outcome-section.component.html',
  styleUrls: ['./toc-action-area-outcome-section.component.scss']
})
export class TocActionAreaOutcomeSectionComponent {
  inits = ['INIT-17 SAPLING'];
  otherContributorsList = ['INIT-10 F2R-CWANA'];
  // , 'INIT-22 TAFS-WCA'
  yesornotValue = true;
  select = 1;
  constructor() {}
}
