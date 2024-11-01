import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../../../../../../../services/manage-innovations-list.service';
import { IpsrDataControlService } from '../../../../../../../../../../services/ipsr-data-control.service';
import { Router } from '@angular/router';

interface ComplementaryInnovation {
  climate_change_tag_level_id: string;
  created_date: string;
  description: string;
  gender_tag_level_id: string;
  initiative_id: number;
  initiative_name: string;
  initiative_official_code: string;
  initiative_short_name: string;
  lead_contact_person: string;
  result_code: string;
  result_id: string;
  result_level_name: string;
  result_type_id: number;
  result_type_name: string;
  title: string;
  selected: boolean;
}
@Component({
  selector: 'app-table-innovation',
  templateUrl: './table-innovation.component.html',
  styleUrls: ['./table-innovation.component.scss']
})
export class TableInnovationComponent {
  @Input() dataTable: any[] = [];
  @Input() columns: any[];
  @Output() selectEvent = new EventEmitter<ComplementaryInnovation>();
  @Output() editEvent = new EventEmitter<any>();
  @Output() cancelEvent = new EventEmitter<any>();

  searchText = '';
  status = false;
  statusAdd = false;
  isReadonly = false;
  isInitiative: boolean = true;
  informationComplentary: ComplementaryInnovationClass = new ComplementaryInnovationClass();
  columnOrder = [
    { title: 'Code', attr: 'result_code', width: '61px' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Lead', attr: 'initiative_official_code', width: '70px' },
    { title: 'Innovation Type', attr: 'result_type_name', width: '150px' },
    { title: 'Creation date', attr: 'created_date', width: '150px' }
  ];
  awareOptions = [
    { name: 'Yes', value: true },
    { name: 'No', value: false }
  ];
  selectComplementary: any[] = [];
  complementaries = false;
  idInnovation: number;

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    public manageInnovationsListSE: ManageInnovationsListService
  ) {}

  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectEvent.emit(result);
  }

  cancelInnovationEvent(result_id) {
    this.cancelEvent.emit(result_id);
  }

  getComplementaryInnovation(id, isRead, result) {
    this.isInitiative = this.api.rolesSE.validateInitiative(this.ipsrDataControlSE.initiative_id);
    if (result.result_type_id == 11) {
      this.status = true;
      if (isRead == 0) {
        this.isReadonly = true;
      } else {
        this.isReadonly = false;
      }
      this.idInnovation = id;
      this.api.resultsSE.GETComplementaryById(id).subscribe(resp => {
        this.complementaries = false;
        this.selectComplementary = [];
        this.informationComplentary.projects_organizations_working_on_innovation =
          resp['response']['findResultComplementaryInnovation']['projects_organizations_working_on_innovation'];
        this.informationComplentary.specify_projects_organizations =
          resp['response']['findResultComplementaryInnovation']['specify_projects_organizations'];
        this.informationComplentary.title = resp['response']['findResult']['title'];
        this.informationComplentary.description = resp['response']['findResult']['description'];
        this.informationComplentary.short_title = resp['response']['findResultComplementaryInnovation']['short_title'];
        this.informationComplentary.other_funcions = resp['response']['findResultComplementaryInnovation']['other_funcions'];
        this.informationComplentary.referenceMaterials = resp['response']['evidence'];
        resp['response']['findComplementaryInnovationFuctions'].forEach(element => {
          this.selectComplementary.push(element['complementary_innovation_function_id']);
        });
        setTimeout(() => {
          this.complementaries = true;
        }, 100);
      });
    } else {
      const url = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
      window.open(url, '_blank');
    }
  }

  addNewInput() {
    if (this.informationComplentary.referenceMaterials.length < 3) {
      this.informationComplentary.referenceMaterials.push(new References());
    } else {
      this.statusAdd = true;
    }
  }

  onSave() {
    this.informationComplentary.complementaryFunctions = [];
    for (const element of this.selectComplementary) {
      const complementaryFunctions = {
        complementary_innovation_functions_id: element
      };
      this.informationComplentary.complementaryFunctions.push(complementaryFunctions);
    }
    this.api.resultsSE.PATCHcomplementaryinnovation(this.informationComplentary, this.idInnovation).subscribe(resp => {
      this.status = false;
      this.editEvent.emit(true);
    });
  }

  onDelete(id, callback?) {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to remove this complementary innovation?`,
        description: ``,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.api.resultsSE.DELETEcomplementaryinnovation(id).subscribe({
          next: resp => {
            this.status = false;
            this.editEvent.emit(true);
          },
          error: err => {
            this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
          },
          complete: () => {
            callback?.();
          }
        });
      }
    );
  }
}

export class ComplementaryInnovationClass {
  short_title: string = null;
  title: string = null;
  description: string = null;
  referenceMaterials: References[] = [];
  complementaryFunctions: any[] = new Array();
  other_funcions: string;
  projects_organizations_working_on_innovation: string;
  specify_projects_organizations: boolean;
}

export class References {
  link: string = null;
}
