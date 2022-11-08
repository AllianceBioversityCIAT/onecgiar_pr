import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-toc-initiative-output-section',
  templateUrl: './toc-initiative-output-section.component.html',
  styleUrls: ['./toc-initiative-output-section.component.scss']
})
export class TocInitiativeOutputSectionComponent {
  inits = [{ name: 'INIT-17 SAPLING', yesornotValue: true, select: null }];
  otherContributorsList = [
    { name: 'INIT-10 F2R-CWANA', yesornotValue: true, select: null },
    { name: 'INIT-22 TAFS-WCA', yesornotValue: false, select: null }
  ];
  yesornotValue = true;
  select = 1;
  constructor() {}
}
