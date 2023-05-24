import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-two-basic-info',
  templateUrl: './step-two-basic-info.component.html',
  styleUrls: ['./step-two-basic-info.component.scss']
})
export class StepTwoBasicInfoComponent implements OnInit {

innovationCompletary :any = [];
  constructor(public api: ApiService,) { }
  informartion:any = []
  ngOnInit(): void {
    this.api.isStepTwoTwo = true;
    this.api.isStepTwoOne = false;
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp) =>{
        console.log(resp);
        this.innovationCompletary = resp['response'];
        this.innovationCompletary.map((inno: any) => {
          inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.initiative_official_code} ${inno?.initiative_official_code} ${inno?.lead_contact_person} yes no `;
          inno.result_code = Number(inno.result_code);
        });
      })

      this.api.resultsSE.getStepTwoComentariesInnovation().subscribe((resp) =>{
        console.log(resp);
        this.informartion = resp['response']['comentaryPrincipals']
      })
  }

  onSaveSection(){
    
  }

}
