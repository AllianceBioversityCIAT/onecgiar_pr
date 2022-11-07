import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-toc-initiative-outcome-section',
  templateUrl: './toc-initiative-outcome-section.component.html',
  styleUrls: ['./toc-initiative-outcome-section.component.scss']
})
export class TocInitiativeOutcomeSectionComponent {
  inits = [{ name: 'INIT-17 SAPLING', yesornotValue: false, select: null }];
  otherContributorsList = [
    { name: 'INIT-10 F2R-CWANA', yesornotValue: true, select: null },
    { name: 'INIT-22 TAFS-WCA', yesornotValue: false, select: null }
  ];
}
