import { Component, Input, OnInit } from '@angular/core';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n3-assessed-expert-workshop',
  templateUrl: './step-n3-assessed-expert-workshop.component.html',
  styleUrls: ['./step-n3-assessed-expert-workshop.component.scss']
})
export class StepN3AssessedExpertWorkshopComponent {
  @Input() body: any;
  radioOptions = [];
  readinessList = [];
  useList = [];
  attrList = ['', 'current_innovation_readiness_level', 'current_innovation_use_level', 'potential_innovation_readiness_level', 'potential_innovation_use_level'];
  informationList = [
    {
      title: 'Core innovation',
      description: 'Technology and business model for mechanized rice straw collection in Vietnam'
    },
    {
      title: 'Complementary innovation / enabler / solution #1',
      description: 'GenderUp for scaling: A method that supports innovation teams in gender responsible scaling'
    },
    {
      title: 'Complementary innovation / enabler / solution #2',
      description: 'Framework developed to prioritize innovations and technologies with potential to reduce food systems greenhouse gas emissions'
    }
  ];

  constructor(private api: ApiService, private ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit(): void {
    this.api.resultsSE.getAssessedDuringExpertWorkshop().subscribe(({ response }) => {
      //(response);
      this.radioOptions = response;
    });
    this.GETAllClarisaInnovationReadinessLevels();
    this.GETAllClarisaInnovationUseLevels();
  }
  useLevelDelfAssessment() {
    return `<a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels`;
  }
  goToStep() {
    return `In case you want to add one more complementary innovation / enabler / solution <a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation' target='_blank'> Go to step 2</a>
    <br>
    <a href="https://drive.google.com/file/d/1muDLtqpeaSCIX60g6qQG_GGOPR61Rq7E/view" class="open_route" target="_blank">Click here </a> to see the definition of all readiness levels<br>
    <a href="https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view"  class="open_route" target="_blank">Click here</a> to see all innovation use levels
    `;
  }
  GETAllClarisaInnovationReadinessLevels() {
    this.api.resultsSE.GETAllClarisaInnovationReadinessLevels().subscribe(({ response }) => {
      //(response);
      this.readinessList = response;
      this.readinessList.map((option, index) => (option.index = String(index)));
    });
  }
  GETAllClarisaInnovationUseLevels() {
    this.api.resultsSE.GETAllClarisaInnovationUseLevels().subscribe(({ response }) => {
      this.useList = response;
      this.useList.map((option, index) => (option.index = String(index)));
    });
  }
  rangeListByIndex(index) {
    if (index % 2 === 0) {
      return this.useList; // Es par
    } else {
      return this.readinessList; // Es impar
    }
  }
}
