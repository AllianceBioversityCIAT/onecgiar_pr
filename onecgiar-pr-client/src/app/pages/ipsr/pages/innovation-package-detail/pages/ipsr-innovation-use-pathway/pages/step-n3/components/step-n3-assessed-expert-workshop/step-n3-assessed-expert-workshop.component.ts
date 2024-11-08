import { Component, Input, OnInit } from '@angular/core';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n3-assessed-expert-workshop',
  templateUrl: './step-n3-assessed-expert-workshop.component.html',
  styleUrls: ['./step-n3-assessed-expert-workshop.component.scss']
})
export class StepN3AssessedExpertWorkshopComponent implements OnInit {
  @Input() body: any;
  radioOptions = [];
  readinessList = [];
  useList = [];
  attrList = [
    '',
    'current_innovation_readiness_level',
    'current_innovation_use_level',
    'potential_innovation_readiness_level',
    'potential_innovation_use_level'
  ];
  informationList = [
    {
      title: 'Core innovation',
      description: 'Technology and business model for mechanized rice straw collection in Vietnam'
    },
    {
      title: 'Complementary innovation/enabler/solution #1',
      description: 'GenderUp for scaling: A method that supports innovation teams in gender responsible scaling'
    },
    {
      title: 'Complementary innovation/enabler/solution #2',
      description: 'Framework developed to prioritize innovations and technologies with potential to reduce food systems greenhouse gas emissions'
    }
  ];

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

  ngOnInit(): void {
    this.api.resultsSE.getAssessedDuringExpertWorkshop().subscribe(({ response }) => {
      this.radioOptions = response;
    });
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
  }

  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`;
  }

  goToStep() {
    return `<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${this.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2</a>.</li>
    <li><a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view" class="open_route" target="_blank">Click here </a> to see the definition of all readiness levels.</li>
    <li><a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels.</li>
    <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>
    `;
  }

  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      this.readinessList = response;
      this.readinessList.forEach((option, index) => (option.index = String(index)));
    });
  }

  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevels().subscribe(({ response }) => {
      this.useList = response;
      this.useList.forEach((option, index) => (option.index = String(index)));
    });
  }

  rangeListByIndex(index) {
    if (index % 2 === 0) {
      return this.useList;
    } else {
      return this.readinessList;
    }
  }
}
