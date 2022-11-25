import { Component, Input, OnInit } from '@angular/core';
import { ImpactAreasService } from '../../../../../../../../shared/services/global/impact-areas.service';

@Component({
  selector: 'app-toc-impact-section',
  templateUrl: './toc-impact-section.component.html',
  styleUrls: ['./toc-impact-section.component.scss']
})
export class TocImpactSectionComponent {
  @Input() impacts: any;
  constructor(public impactAreasSE: ImpactAreasService) {}
}
