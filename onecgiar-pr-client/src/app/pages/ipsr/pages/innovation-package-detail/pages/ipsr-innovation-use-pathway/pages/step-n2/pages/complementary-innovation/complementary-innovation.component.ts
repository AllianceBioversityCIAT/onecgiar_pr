import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';


export class ComplementaryInnovation {
  climate_change_tag_level_id:string;
  created_date:string;
  description:string;
  gender_tag_level_id:string;
  initiative_id:number;
  initiative_name:string;
  initiative_official_code:string;
  initiative_short_name:string;
  lead_contact_person: string;
  result_code:string;
  result_id:string;
  result_level_name:string;
  result_type_id:number;
  result_type_name:string;
  title:string;
  selected:boolean;
}

@Component({
  selector: 'app-complementary-innovation',
  templateUrl: './complementary-innovation.component.html',
  styleUrls: ['./complementary-innovation.component.scss']
})
export class ComplementaryInnovationComponent implements OnInit {
  innovationPackageCreatorBody:ComplementaryInnovation[] = [];
  complemntaryFunction:any;
  status:boolean = false;
  informationComplementaryInnovations:any[] = [];
  constructor(public api: ApiService, private ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect().subscribe((resp) => {
      this.innovationPackageCreatorBody = resp['response']
      console.log(resp);
      
    });

    this.api.resultsSE.GETComplementataryInnovationFunctions().subscribe((resp) => {
      console.log(resp);
      this.complemntaryFunction = resp['response']
    });

    this.getInformationInnovationComentary(false);
  }

  selectInnovationEvent(e) {
    this.innovationPackageCreatorBody.push(e);
    
  }

  async createInnovationEvent(e) {
    this.innovationPackageCreatorBody.push(e);
    this.getInformationInnovationComentary(true);
  }

  cancelInnovation(result_id:any){
    const index = this.innovationPackageCreatorBody.findIndex((resp)=> resp.result_id == result_id)
    const innovationFind = this.informationComplementaryInnovations.find(resp => this.innovationPackageCreatorBody[index].result_code == resp.result_code)
    innovationFind.selected = false;
    this.innovationPackageCreatorBody.splice(index,1)
  }

  regiterInnovationComplementary(complementaryInnovcation){
    let seletedInnovation = []
    complementaryInnovcation.forEach(element => {
      seletedInnovation.push({
        result_id:element['result_id'],
      })
    });

    return seletedInnovation;
  }

  async onSaveSection(){
    let body = await this.regiterInnovationComplementary(this.innovationPackageCreatorBody);
    
    this.api.resultsSE.PATCHComplementaryInnovation({ complementaryInovatins:body}).subscribe((resp) =>{
      console.log(resp);
     
    })
    console.log(this.regiterInnovationComplementary(this.innovationPackageCreatorBody));
  }

  async getInformationInnovationComentary(estado){
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp) =>{
      console.log(resp);
      this.informationComplementaryInnovations = resp['response'];
      this.innovationPackageCreatorBody.map(seleccionado=>{
        let encontrado = this.informationComplementaryInnovations.find(tablaItem=>tablaItem.result_code == seleccionado.result_code)
        encontrado.selected = true;
      })
      this.informationComplementaryInnovations.map((inno: any) => {
        inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.initiative_official_code} ${inno?.initiative_official_code} ${inno?.lead_contact_person} yes no `;
        inno.result_code = Number(inno.result_code);
      });
    })
  }
}
