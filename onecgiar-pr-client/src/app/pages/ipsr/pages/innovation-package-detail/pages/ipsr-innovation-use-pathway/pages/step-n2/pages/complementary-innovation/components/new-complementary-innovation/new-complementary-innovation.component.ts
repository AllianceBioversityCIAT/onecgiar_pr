import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../../../services/ipsr-data-control.service';

export class CreateComplementaryInnovationDto {
   result_code: number;
   title: string;
   short_title: string;
   description: string;
   other_funcions: string;
   initiative_id: number;
   is_active: boolean;
   complementaryFunctions: any[];
   referenceMaterials: any[];
}

@Component({
  selector: 'app-new-complementary-innovation',
  templateUrl: './new-complementary-innovation.component.html',
  styleUrls: ['./new-complementary-innovation.component.scss']
})
export class NewComplementaryInnovationComponent implements OnInit {

  constructor(public api: ApiService,  private ipsrDataControlSE: IpsrDataControlService) { }
  status:boolean;
  linksRegister:number = 1;
  inputs:any = [1];
  disabled:boolean = true;
  @Input() complementaryInnovationFunction:any;
  linksComplemntary:any;
  linksComplemntaryInnovation:any =[];
  bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
  selectedValues: any[] = [];
  @Output() selectInnovationEvent = new EventEmitter<any>();
  ngOnInit(): void {
    console.log(this.complementaryInnovationFunction);
    this.linksComplemntaryInnovation = [
      {link:''},{link:''},{link:''}
    ]
  }


  addNewInput(){
    if(this.linksRegister < 3){
      if(this.linksComplemntaryInnovation[this.linksRegister-1].link != ''){
        this.linksRegister++;
        this.inputs.push(this.linksRegister);
      }
      
    }
  }

  onSave(){
    this.linksComplemntaryInnovation = this.linksComplemntaryInnovation.filter(element => element.link != '');
    this.bodyNewComplementaryInnovation.referenceMaterials = this.linksComplemntaryInnovation;
    this.bodyNewComplementaryInnovation.complementaryFunctions = this.selectedValues;
    this.bodyNewComplementaryInnovation.initiative_id = Number(this.ipsrDataControlSE.detailData.inititiative_id);
    if(this.bodyNewComplementaryInnovation.other_funcions == undefined){
      this.bodyNewComplementaryInnovation.other_funcions = ''
    }
    console.log(this.bodyNewComplementaryInnovation);
    this.linksComplemntaryInnovation = [{link:''},{link:''},{link:''}]
    
    
    this.api.resultsSE.POSTNewCompletaryInnovation(this.bodyNewComplementaryInnovation).subscribe((resp)=>{
      console.log(resp);
      
    });
    this.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    this.status = false;
  }

  change(id_select:any){
    if(this.selectedValues.length == 0){
      this.selectedValues.push({ complementary_innovation_functions_id: id_select})
    }else{
      let index = this.selectedValues.findIndex(elemt=> elemt.complementary_innovation_functions_id == id_select)
      if(index == -1){
        this.selectedValues.push({ complementary_innovation_functions_id: id_select})
      }else{
        this.selectedValues.splice(index,1)
      }
    }    
  }

}
