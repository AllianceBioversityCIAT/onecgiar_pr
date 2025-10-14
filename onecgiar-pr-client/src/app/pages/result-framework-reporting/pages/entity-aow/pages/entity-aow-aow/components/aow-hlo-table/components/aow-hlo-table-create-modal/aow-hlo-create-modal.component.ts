import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';

interface CreateResultBody {
  handler: string;
  result_name: string;
  toc_progressive_narrative: string;
}

@Component({
  selector: 'app-aow-hlo-create-modal',
  imports: [CommonModule, DialogModule, CustomFieldsModule, MultiSelectModule, FormsModule],
  templateUrl: './aow-hlo-create-modal.component.html',
  styleUrl: './aow-hlo-create-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowHloCreateModalComponent implements OnInit {
  api = inject(ApiService);
  entityAowService = inject(EntityAowService);

  allInitiatives = signal<any[]>([]);
  createResultBody = signal<CreateResultBody>({
    handler: '',
    result_name: '',
    toc_progressive_narrative: ''
  });
  mqapJson = signal<any>(null);
  validatingHandler = signal<boolean>(false);
  mqapUrlError = signal<{ status: boolean; message: string }>({
    status: false,
    message: ''
  });

  creatingResult = signal<boolean>(false);

  ngOnInit() {
    this.entityAowService.getW3BilateralProjects();
    this.entityAowService.getExistingResultsContributors();
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe(({ response }) => {
      this.allInitiatives.set(response);
    });
  }

  removeBilateralProject(project: any) {
    this.entityAowService.selectedW3BilateralProjects.set(
      this.entityAowService.selectedW3BilateralProjects().filter(item => item.project_id !== project.project_id)
    );
  }

  removeEntityOption(option: any) {
    this.entityAowService.selectedEntities.set(this.entityAowService.selectedEntities().filter(item => item.id !== option.id));
  }

  GET_mqapValidation() {
    this.validatingHandler.set(true);

    if (!this.createResultBody().handler) {
      this.mqapUrlError.set({
        status: true,
        message: 'Please enter a valid handle.'
      });
      this.validatingHandler.set(false);
      return;
    }

    const regex =
      /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;

    const isValid = regex.test(this.createResultBody().handler);

    if (!isValid) {
      this.mqapUrlError.set({
        status: true,
        message:
          'Please ensure that the handle is from the <a href="https://cgspace.cgiar.org/home" target="_blank" rel="noopener noreferrer">CGSpace repository</a> and not other CGIAR repositories.'
      });
      this.validatingHandler.set(false);
      return;
    }

    this.mqapUrlError.set({
      status: false,
      message: ''
    });

    this.api.resultsSE.GET_mqapValidation(this.createResultBody().handler).subscribe({
      next: resp => {
        this.mqapJson.set(resp.response);
        this.createResultBody.set({
          ...this.createResultBody(),
          result_name: resp.response.title
        });
        this.validatingHandler.set(false);
        this.api.alertsFe.show({
          id: 'reportResultSuccess',
          title: 'Metadata successfully retrieved',
          description: 'Title: ' + this.createResultBody().result_name,
          status: 'success'
        });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.validatingHandler.set(false);
        this.createResultBody().result_name = '';
      }
    });
  }

  createResult() {
    this.creatingResult.set(true);

    const body = {
      result: {
        result_type_id: this.entityAowService.currentResultToReport().indicators[0].result_type_id,
        result_level_id: this.entityAowService.currentResultToReport().indicators[0].result_level_id,
        initiative_id: this.entityAowService.entityDetails().id,
        result_name: this.createResultBody().result_name,
        handler: this.createResultBody().handler
      },
      knowledge_product: this.mqapJson(),
      toc_result_id: this.entityAowService.currentResultToReport().toc_result_id,
      toc_progressive_narrative: this.createResultBody().toc_progressive_narrative,
      indicators: this.entityAowService.currentResultToReport().indicators[0],
      contributors_result_toc_result: this.entityAowService.selectedEntities(),
      bilateral_project: this.entityAowService.selectedW3BilateralProjects()
    };

    this.api.resultsSE.POST_createResult(body).subscribe({
      next: resp => {
        this.api.alertsFe.show({ id: 'reportResultSuccess', title: 'Result created', status: 'success', closeIn: 500 });
        this.entityAowService.onCloseReportResultModal();
        this.creatingResult.set(false);
      },
      error: err => {
        this.api.alertsFe.show({ id: 'reportResultError', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.creatingResult.set(false);
      }
    });
  }
}
