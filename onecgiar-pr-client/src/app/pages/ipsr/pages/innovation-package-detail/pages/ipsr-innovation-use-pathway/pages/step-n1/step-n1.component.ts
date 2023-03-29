import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-step-n1',
  templateUrl: './step-n1.component.html',
  styleUrls: ['./step-n1.component.scss']
})
export class StepN1Component implements OnInit {
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationPathwayByStepOneResultId().subscribe(resp => {
      console.log(resp);
    });
  }
  onSaveSection() {
    this.api.resultsSE.PATCHInnovationPathwayByStepOneResultId({}).subscribe(resp => {
      console.log(resp);
    });
  }
}
