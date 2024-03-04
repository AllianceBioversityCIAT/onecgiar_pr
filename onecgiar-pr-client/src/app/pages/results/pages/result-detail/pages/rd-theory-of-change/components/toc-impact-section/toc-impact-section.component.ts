import { Component, Input } from '@angular/core';
import { ImpactAreasService } from '../../../../../../../../shared/services/global/impact-areas.service';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrYesOrNotComponent } from '../../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';

@Component({
  selector: 'app-toc-impact-section',
  standalone: true,
  templateUrl: './toc-impact-section.component.html',
  styleUrls: ['./toc-impact-section.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrYesOrNotComponent
  ]
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
