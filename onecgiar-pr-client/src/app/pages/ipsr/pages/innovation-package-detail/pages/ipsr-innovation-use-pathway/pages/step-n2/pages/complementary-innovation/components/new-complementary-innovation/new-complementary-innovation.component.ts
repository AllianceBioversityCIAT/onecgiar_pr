import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  projects_organizations_working_on_innovation: boolean;
  specify_projects_organizations: string;
}

@Component({
  selector: 'app-new-complementary-innovation',
  templateUrl: './new-complementary-innovation.component.html',
  styleUrls: ['./new-complementary-innovation.component.scss']
})
export class NewComplementaryInnovationComponent implements OnInit {
  status: boolean;
  linksRegister: number = 1;
  inputs: any = [1];
  disabled: boolean = true;
  statusAdd: boolean = false;
  awareOptions = [
    { name: 'Yes', value: true },
    { name: 'No', value: false }
  ];
  @Input() complementaryInnovationFunction: any;
  linksComplemntary: any;
  linksComplemntaryInnovation: any = [];
  bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
  selectedValues: any[] = [];
  @Output() createInnovationEvent = new EventEmitter<any>();

  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService) {}

  ngOnInit(): void {
    this.linksComplemntaryInnovation = [{ link: '' }, { link: '' }, { link: '' }];
  }

  addNewInput() {
    if (this.linksRegister < 3) {
      if (this.linksComplemntaryInnovation[this.linksRegister - 1].link != '') {
        this.linksRegister++;
        this.inputs.push(this.linksRegister);
      }
    }
    if (this.linksRegister == 3) {
      this.statusAdd = true;
    }
  }

  onSave() {
    this.linksComplemntaryInnovation = this.linksComplemntaryInnovation.filter(element => element.link != '');
    this.bodyNewComplementaryInnovation.referenceMaterials = this.linksComplemntaryInnovation;
    this.bodyNewComplementaryInnovation.complementaryFunctions = this.selectedValues;
    this.bodyNewComplementaryInnovation.initiative_id = Number(this.ipsrDataControlSE?.detailData?.inititiative_id);
    if (this.bodyNewComplementaryInnovation.other_funcions == undefined) {
      this.bodyNewComplementaryInnovation.other_funcions = '';
    }
    this.linksComplemntaryInnovation = [{ link: '' }, { link: '' }, { link: '' }];

    let innovation;
    this.api.resultsSE.POSTNewCompletaryInnovation(this.bodyNewComplementaryInnovation).subscribe(resp => {
      innovation = resp['response']['createResult'];
      if (innovation['initiative_id'] < 10) {
        innovation['initiative_official_code'] = 'INIT-0' + innovation['initiative_id'];
      } else {
        innovation['initiative_official_code'] = 'INIT-' + innovation['initiative_id'];
      }

      this.createInnovationEvent.emit(innovation);
    });
    this.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
    this.status = false;
    this.selectedValues = [];
  }

  change(id_select: any) {
    if (this.selectedValues.length == 0) {
      this.selectedValues.push({ complementary_innovation_functions_id: id_select });
    } else {
      const index = this.selectedValues.findIndex(elemt => elemt.complementary_innovation_functions_id == id_select);
      if (index == -1) {
        this.selectedValues.push({ complementary_innovation_functions_id: id_select });
      } else {
        this.selectedValues.splice(index, 1);
      }
    }
  }
}
