import { Component, Input } from '@angular/core';
import { ImpactAreasService } from '../../../../../../../../shared/services/global/impact-areas.service';

@Component({
    selector: 'app-toc-impact-section',
    templateUrl: './toc-impact-section.component.html',
    styleUrls: ['./toc-impact-section.component.scss'],
    standalone: false
})
export class TocImpactSectionComponent {
  @Input() impacts: any;
  @Input() sdg: any = [];
  @Input() contributing_initiatives: any = [];
  isFalse = false;

  constructor(public impactAreasSE: ImpactAreasService) {}

  getLabel(full_name) {
    return `Is this result planned in the ${full_name} SAPLING ToC?:`;
  }
}
