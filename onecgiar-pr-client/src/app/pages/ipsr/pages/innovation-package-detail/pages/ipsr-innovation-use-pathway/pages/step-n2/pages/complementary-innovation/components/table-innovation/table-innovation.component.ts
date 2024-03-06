import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../../../../../../../services/manage-innovations-list.service';
import { IpsrDataControlService } from 'src/app/pages/ipsr/services/ipsr-data-control.service';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { FilterByTextPipe } from '../../../../../../../../../../../../shared/pipes/filter-by-text.pipe';
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrTextareaComponent } from '../../../../../../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { CheckboxModule } from 'primeng/checkbox';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { CommonModule, NgClass, NgIf } from '@angular/common';

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
  standalone: true,
  templateUrl: './table-innovation.component.html',
  styleUrls: ['./table-innovation.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    FilterByTextPipe,
    DialogModule,
    PrFieldHeaderComponent,
    PrInputComponent,
    PrTextareaComponent,
    CheckboxModule,
    PrButtonComponent,
    PrRadioButtonComponent
  ]
})
export class TableInnovationComponent {
  coreInnovationSelected: ComplementaryInnovation;
  searchText = '';
  InnovationSelect: any;
  status = false;
  statusAdd = false;
  isReadonly = false;
  informationComplementaryInnovation: ComplementaryInnovation[] = [];
  loading: boolean = true;
  isInitiative: boolean = true;
  informationComplentary: ComplementaryInnovation2 =
    new ComplementaryInnovation2();
  @Output() selectInnovationEvent = new EventEmitter<ComplementaryInnovation>();
  @Output() saveedit = new EventEmitter<any>();
  @Input() selectionsInnovation: any[];
  @Input() informationComplementaryInnovations: any[] = [];
  @Input() columns: any[];
  selectComplementary: any[] = [];
  complementaries = false;
  idInnovation: number;

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    public manageInnovationsListSE: ManageInnovationsListService
  ) {}

  columnOrder = [
    { title: 'Code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Lead', attr: 'initiative_official_code' },
    { title: 'Innovation Type', attr: 'result_type_name' },
    { title: 'Creation date', attr: 'created_date' }
  ];
  awareOptions = [
    { name: 'Yes', value: true },
    { name: 'No', value: false }
  ];
  openInNewPage(link) {
    window.open(link, '_blank');
  }
  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectInnovationEvent.emit(result);
  }

  getComplementaryInnovation(id, isRead, result) {
    this.isInitiative = this.api.rolesSE.validateInitiative(
      this.ipsrDataControlSE.initiative_id
    );
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
          resp['response']['findResultComplementaryInnovation'][
            'projects_organizations_working_on_innovation'
          ];
        this.informationComplentary.specify_projects_organizations =
          resp['response']['findResultComplementaryInnovation'][
            'specify_projects_organizations'
          ];
        this.informationComplentary.title =
          resp['response']['findResult']['title'];
        this.informationComplentary.description =
          resp['response']['findResult']['description'];
        this.informationComplentary.short_title =
          resp['response']['findResultComplementaryInnovation']['short_title'];
        this.informationComplentary.other_funcions =
          resp['response']['findResultComplementaryInnovation'][
            'other_funcions'
          ];
        this.informationComplentary.referenceMaterials =
          resp['response']['evidence'];
        resp['response']['findComplementaryInnovationFuctions'].forEach(
          element => {
            this.selectComplementary.push(
              element['complementary_innovation_function_id']
            );
          }
        );
        setTimeout(() => {
          this.complementaries = true;
        }, 100);
      });
    } else {
      const url =
        '/result/result-detail/' +
        result['result_code'] +
        '/general-information';
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

  selected() {}

  onSave() {
    this.informationComplentary.complementaryFunctions = [];

    for (const element of this.selectComplementary) {
      const complementaryFunctions = {
        complementary_innovation_functions_id: element
      };
      this.informationComplentary.complementaryFunctions.push(
        complementaryFunctions
      );
    }

    this.api.resultsSE
      .PATCHcomplementaryinnovation(
        this.informationComplentary,
        this.idInnovation
      )
      .subscribe(resp => {
        this.status = false;
        this.saveedit.emit(true);
      });
  }

  Ondelete(id) {
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
            this.saveedit.emit(true);
          },
          error: err => {
            this.api.alertsFe.show({
              id: 'delete-error',
              title: 'Error when delete result',
              description: '',
              status: 'error'
            });
          }
        });
      }
    );
  }
}

export class ComplementaryInnovation2 {
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
