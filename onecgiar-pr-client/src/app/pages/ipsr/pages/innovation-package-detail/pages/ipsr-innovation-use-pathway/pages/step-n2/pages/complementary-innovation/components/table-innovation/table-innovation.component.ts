import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
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
export class TableInnovationComponent implements OnInit {

  coreInnovationSelected: ComplementaryInnovation;
  searchText = '';
  InnovationSelect:any;
  informationComplementaryInnovation:ComplementaryInnovation[] = [];
  loading:boolean = true;
  @Output() selectInnovationEvent = new EventEmitter<ComplementaryInnovation>();
  constructor(public api: ApiService, public manageInnovationsListSE: ManageInnovationsListService) {}

  ngOnInit(): void {
    this.cleanSelected();
  }
  ngOnChanges(changes: SimpleChanges) {
    this.InnovationSelect= changes['selectInnovations'].currentValue;
    this.InnovationSelect.forEach(element => {
      this.findResultSelected(element.result_id)
    });
    
    
  }

  ngOnDestroy(): void {
    this.cleanSelected();
  }

  columnOrder = [
    { title: 'Title', attr: 'title' , class: 'notCenter' },
    { title: 'Lead', attr: 'lead_contact_person'},
    { title: 'is QAed', attr: 'status' },
    { title: 'Creation date', attr: 'created_date' }
  ];
  openInNewPage(link) {
    window.open(link, '_blank');
  }
  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectInnovationEvent.emit(result);  
  }

  cleanSelected() {
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp) =>{
      console.log(resp);
      this.informationComplementaryInnovation = resp.response;
      this.loading = false;
    })
  }
  findResultSelected(id_result){
    this.informationComplementaryInnovation.find((resp)=> resp.result_id == id_result? resp.selected = true:  resp.selected = false)
  }
}
