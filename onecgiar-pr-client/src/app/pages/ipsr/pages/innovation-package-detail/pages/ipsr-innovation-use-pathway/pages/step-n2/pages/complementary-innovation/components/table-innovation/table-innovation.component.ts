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
export class TableInnovationComponent implements OnInit {

  coreInnovationSelected: ComplementaryInnovation;
  searchText = '';
  InnovationSelect:any;
  informationComplementaryInnovation:ComplementaryInnovation[] = [];
  loading:boolean = true;
  @Output() selectInnovationEvent = new EventEmitter<ComplementaryInnovation>();
  @Input() selectionsInnovation :any [];
  constructor(public api: ApiService, public manageInnovationsListSE: ManageInnovationsListService) {}

  ngOnInit(): void {
    this.cleanSelected();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    // changes.prop contains the old and the new value...
    this.selectionsInnovation= changes['selectionsInnovation'].currentValue;
  }

  ngOnDestroy(): void {
    this.cleanSelected();
  }

  columnOrder = [
    { title: 'Title', attr: 'title' , class: 'notCenter' },
    { title: 'Lead', attr: 'initiative_official_code'},
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
      this.informationComplementaryInnovation = resp['response'];
      this.informationComplementaryInnovation.map((inno: any) => {
        inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.initiative_official_code} ${inno?.initiative_official_code} ${inno?.lead_contact_person} yes no `;
        inno.result_code = Number(inno.result_code);
      });
    })
  }

  findResultSelected(result: ComplementaryInnovation){
    this.selectionsInnovation.find((resp)=> resp.result_id == result.result_id? result.selected = true:  result.selected = false);
  }


}
