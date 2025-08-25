import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CreateResultManagementService } from '../../services/create-result-management.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { Initiative } from '../../../../../../shared/interfaces/initiatives.interface';
import { AiUploadFileComponent } from './components/ai-upload-file/ai-upload-file.component';
import { FormsModule } from '@angular/forms';
import { AiNotDataFoundComponent } from './components/ai-not-data-found/ai-not-data-found.component';
import { ResultAiItemComponent } from './components/result-ai-item/result-ai-item.component';
import { AiFeedbackComponent } from './components/ai-feedback/ai-feedback.component';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AiLoadingStateComponent } from './components/ai-loading-state/ai-loading-state.component';
import { AiLoadingStateService } from './components/ai-loading-state/services/ai-loading-state.service';

export interface Step {
  label: string;
  completed: boolean;
  inProgress: boolean;
  progress: number;
}

@Component({
  selector: 'app-result-ai-assistant',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    CustomFieldsModule,
    AiUploadFileComponent,
    ResultAiItemComponent,
    AiNotDataFoundComponent,
    AiFeedbackComponent,
    PaginatorModule,
    AiLoadingStateComponent
  ],
  standalone: true,
  templateUrl: './result-ai-assistant.component.html',
  styleUrl: './result-ai-assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultAiAssistantComponent implements OnInit {
  createResultManagementService = inject(CreateResultManagementService);
  api = inject(ApiService);
  aiLoadingStateService = inject(AiLoadingStateService);

  initiatives = signal<Initiative[]>([]);

  first = signal(0);
  rows = signal(5);

  ngOnInit() {
    this.getInitiatives();
  }

  getInitiatives() {
    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe(resp => {
      this.initiatives.set(resp.response);
    });
  }

  handleAnalyzeFile() {
    this.createResultManagementService.analyzingDocument.set(true);

    setTimeout(() => {
      this.createResultManagementService.documentAnalyzed.set(true);
      this.createResultManagementService.noResults.set(false);
      this.createResultManagementService.items.set([
        {
          indicator: 'Capacity Sharing for Development',
          title: 'Piloting Rice Planting window and Fertilizer Recommendation through the RiceAdvice Lite App',
          description:
            'Training of extension agents and farmers on the use of RiceAdvice Lite App for rice planting window and fertilizer recommendations in Nigeria, Burkina Faso, and Mali.',
          keywords: ['riceadvice', 'training', 'extension agents', 'farmers'],
          geoscope: [
            {
              country_code: 'CO',
              areas: ['Area 1']
            },
            {
              country_code: 'CO',
              areas: ['Area 2']
            }
          ],
          training_type: 'Group training',
          length_of_training: null,
          start_date: 'Not collected',
          end_date: 'Not collected',
          degree: null,
          delivery_modality: null,
          contract_code: null,
          total_participants: 59038,
          non_binary_participants: '114',
          female_participants: 9647,
          male_participants: 49277,
          evidence_for_stage: 'Evidence for stage 1',
          policy_type: 'Policy type 1',
          stage_in_policy_process: 'Stage in policy process 1',
          result_official_code: 'Result official code 1',
          alliance_main_contact_person_first_name: 'Alliance main contact person first name 1',
          alliance_main_contact_person_last_name: 'Alliance main contact person last name 1'
        }
      ]);
    }, 5000);

    // this.createResultManagementService.documentAnalyzed.set(true);
    // this.createResultManagementService.noResults.set(true);

    this.aiLoadingStateService.startLoadingProgress();
  }

  onPageChange(event: PaginatorState) {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 5);
  }
}
