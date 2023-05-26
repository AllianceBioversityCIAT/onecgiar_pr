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
  informartion:innovationComplementary[];
  ngOnInit(): void {
    this.api.isStepTwoTwo = true;
    this.api.isStepTwoOne = false;
    this.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect().subscribe((resp) => {
      this.informartion = resp['response'];
      this.informartion[0].open = false;
      this.informartion[0].complementary_innovation_enabler_types_one = []
      console.log(resp);
      
    });

      this.api.resultsSE.getStepTwoComentariesInnovation().subscribe((resp) =>{
        console.log(resp);
        this.innovationCompletary = resp['response']['comentaryPrincipals']
      })
  }

  onSaveSection(){
    console.log(this.informartion);
    
  }
  selectes(category,i){
    

  }

  subSelectes(category,i){
    
  }
}

export class innovationComplementary{
  
    result_by_innovation_package_id: string;
    result_id: string;
    result_code: string;
    title: string;
    description: string;
    initiative_id: number;
    initiative_official_code: string;
    is_active: boolean;
    open:boolean = true;
    complementary_innovation_enabler_types_one:enablerTypes[]= new Array();
    complementary_innovation_enabler_types_two:enablerTypes[]= new Array();
}

class enablerTypes{

    complementary_innovation_enabler_types_id: string;
    group: string;
    type: string;

}