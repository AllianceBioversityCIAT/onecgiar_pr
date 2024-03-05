import { Component, Input, OnInit } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';
import { CommonModule } from '@angular/common';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-innovation-team-diversity',
  standalone: true,
  templateUrl: './innovation-team-diversity.component.html',
  styleUrls: ['./innovation-team-diversity.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrRadioButtonComponent
  ]
})
export class InnovationTeamDiversityComponent implements OnInit {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;
  example11 = null;

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  ngOnInit(): void {}
}
