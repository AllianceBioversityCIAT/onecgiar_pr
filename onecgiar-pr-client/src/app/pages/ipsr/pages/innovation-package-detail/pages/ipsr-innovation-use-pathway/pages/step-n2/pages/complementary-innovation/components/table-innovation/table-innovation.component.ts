import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../../../../../../../services/manage-innovations-list.service';
import { Observable } from 'rxjs';

interface ComplementaryInnovation {
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
  selector: 'app-table-innovation',

  templateUrl: './table-innovation.component.html',
  
  styleUrls: ['./table-innovation.component.scss']
})
export class TableInnovationComponent{

  coreInnovationSelected: ComplementaryInnovation;
  searchText = '';
  InnovationSelect:any;
  status = false;
  statusAdd = false;
  informationComplementaryInnovation:ComplementaryInnovation[] = [];
  loading:boolean = true;
  informationComplentary:complementaryInnovation = new complementaryInnovation();
  @Output() selectInnovationEvent = new EventEmitter<ComplementaryInnovation>();
  @Input() selectionsInnovation :any [];
  @Input() informationComplementaryInnovations :any [] = [];
  constructor(public api: ApiService, public manageInnovationsListSE: ManageInnovationsListService) {}

  columnOrder = [
    { title: 'Code', attr: 'result_code'},
    { title: 'Title', attr: 'title' , class: 'notCenter' },
    { title: 'Lead', attr: 'initiative_official_code'},
    { title: 'Innovation Type', attr: 'result_type_name' },
    { title: 'Creation date', attr: 'created_date' }
  ];
  openInNewPage(link) {
    window.open(link, '_blank');
  }
  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectInnovationEvent.emit(result);  
  }

  getComplementaryInnovation(id){
    this.status = true;
    console.log(id);
    
    this.api.resultsSE.GETComplementaryById(id).subscribe((resp) =>{
      console.log(resp['response']['findResult']['title']);

      this.informationComplentary.title = resp['response']['findResult']['title']
      this.informationComplentary.description = resp['response']['findResult']['description']
      this.informationComplentary.short_title = resp['response']['findResultComplementaryInnovation']['short_title']
      this.informationComplentary.referencesMaterial = resp['response']['evidence']

      console.log(this.informationComplentary);
      
    });
  }

  addNewInput(){
    if(this.informationComplentary.referencesMaterial.length  < 3){
      this.informationComplentary.referencesMaterial.push(new references() );
    }else{
      this.statusAdd = true;
    }
  }

}

export class complementaryInnovation{
  short_title:string = null;
  title:string= null;
  description:string= null;
  referencesMaterial:references[] =[];
}

export class references{
  link:string = null;
}