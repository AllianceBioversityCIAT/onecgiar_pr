import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../../../services/ipsr-data-control.service';
import { ComplementaryInnovationService } from '../../services/complementary-innovation.service';

export class CreateComplementaryInnovationDto {
  result_code: number;
  title: string;
  short_title: string;
  description: string;
  other_funcions: string;
  initiative_id: number;
  is_active: boolean;
  complementaryFunctions: any[] = [];
  projects_organizations_working_on_innovation: boolean;
  specify_projects_organizations: string;
}

@Component({
  selector: 'app-new-complementary-innovation',
  templateUrl: './new-complementary-innovation.component.html',
  styleUrls: ['./new-complementary-innovation.component.scss']
})
export class NewComplementaryInnovationComponent {
  @Input() complementaryInnovationFunction: any;
  @Output() createInnovationEvent = new EventEmitter<any>();
  @Output() editEvent = new EventEmitter<any>();
  @Input() columns: any[];

  awareOptions = [
    { name: 'Yes', value: true },
    { name: 'No', value: false }
  ];
  selectedValues: any[] = [];

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    public complementaryInnovationService: ComplementaryInnovationService
  ) {}

  disableSaveButton(): boolean {
    const { short_title, title, projects_organizations_working_on_innovation, other_funcions, complementaryFunctions } =
      this.complementaryInnovationService.bodyNewComplementaryInnovation;

    return (
      !short_title?.trim() ||
      !title?.trim() ||
      (!complementaryFunctions?.length && !other_funcions?.trim()) ||
      projects_organizations_working_on_innovation == null
    );
  }

  onUpdate() {
    this.api.resultsSE
      .PATCHcomplementaryinnovation(
        this.complementaryInnovationService.bodyNewComplementaryInnovation,
        this.complementaryInnovationService.idInnovation
      )
      .subscribe(resp => {
        this.complementaryInnovationService.dialogStatus = false;
        this.editEvent.emit(true);
      });
  }

  onSave() {
    if (this.complementaryInnovationService.isEdit) {
      this.onUpdate();
      return;
    }

    this.complementaryInnovationService.bodyNewComplementaryInnovation.initiative_id = Number(this.ipsrDataControlSE?.detailData?.inititiative_id);

    if (this.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions == undefined) {
      this.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions = '';
    }

    let innovation;

    this.api.resultsSE.POSTNewCompletaryInnovation(this.complementaryInnovationService.bodyNewComplementaryInnovation).subscribe({
      next: ({ response }) => {
        innovation = response.createResult;

        if (innovation.initiative_id < 10) {
          innovation.initiative_official_code = 'INIT-0' + innovation.initiative_id;
        } else {
          innovation.initiative_official_code = 'INIT-' + innovation.initiative_id;
        }

        this.createInnovationEvent.emit(innovation);
        this.complementaryInnovationService.bodyNewComplementaryInnovation = new CreateComplementaryInnovationDto();
        this.complementaryInnovationService.dialogStatus = false;
        this.selectedValues = [];
      },
      error: error => {
        console.error(error);
      }
    });
  }
}
