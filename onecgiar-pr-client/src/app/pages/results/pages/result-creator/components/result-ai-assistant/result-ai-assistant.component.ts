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
import { environment } from '../../../../../../../environments/environment';
import { HttpHeaders } from '@angular/common/http';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { AIAssistantResult } from '../../../../../../shared/interfaces/AIAssistantResult';

export interface Step {
  label: string;
  completed: boolean;
  inProgress: boolean;
  progress: number;
}

interface UploadResponse {
  data?: {
    filename?: string;
  };
}

interface MiningResponse {
  content: MiningTextItem[];
}

interface MiningTextItem {
  type: string;
  text: string;
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
  customizedAlertsFeSE = inject(CustomizedAlertsFeService);

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
    if (!this.createResultManagementService.selectedFile()) {
      this.customizedAlertsFeSE.show({
        id: 'confirm-delete-item',
        title: 'No file selected',
        description: 'Please choose a file to analyze and try again.',
        status: 'warning'
      });
      return;
    }

    this.startAnalysis();
    this.uploadFileForAnalysis();
  }

  private startAnalysis(): void {
    this.createResultManagementService.analyzingDocument.set(true);
    this.aiLoadingStateService.startLoadingProgress();
  }

  private uploadFileForAnalysis(): void {
    const formData = this.createUploadFormData();
    const headers = this.createUploadHeaders();

    this.api.resultsSE.POST_uploadFile(formData, headers).subscribe({
      next: (response: UploadResponse) => this.handleUploadSuccess(response),
      error: (error: any) => this.handleUploadError(error)
    });
  }

  private createUploadFormData(): FormData {
    const selectedFile = this.createResultManagementService.selectedFile();
    const formData = new FormData();

    formData.append('file', selectedFile, selectedFile.name);
    formData.append('bucketName', 'microservice-mining');
    formData.append('fileName', selectedFile.name);
    formData.append('weightLimit', this.calculateWeightLimitBytes().toString());
    formData.append('pageLimit', this.createResultManagementService.pageLimit.toString());
    formData.append('environmentUrl', environment.apiBaseUrl);

    return formData;
  }

  private createUploadHeaders(): HttpHeaders {
    return new HttpHeaders({
      'access-token': this.api.authSE?.localStorageToken,
      'environment-url': environment.apiBaseUrl
    });
  }

  private calculateWeightLimitBytes(): number {
    return this.createResultManagementService.maxSizeMB * 1024 * 1024;
  }

  private handleUploadSuccess(response: UploadResponse): void {
    if (response?.data?.filename) {
      this.processFileMining(response.data.filename);
    } else {
      this.handleError('Invalid response format from file upload');
    }
  }

  private handleUploadError(error: any): void {
    console.error('Error uploading file:', error);
    this.handleError('Error uploading file for analysis');
  }

  private processFileMining(filename: string): void {
    const formData = this.createMiningFormData(filename);
    const headers = this.createMiningHeaders();

    this.api.resultsSE.POST_fileMining(formData, headers).subscribe({
      next: (response: MiningResponse) => this.handleMiningSuccess(response),
      error: (error: any) => this.handleMiningError(error)
    });
  }

  private createMiningFormData(filename: string): FormData {
    const formData = new FormData();
    formData.append('token', this.api.authSE?.localStorageToken);
    formData.append('key', filename);
    formData.append('bucketName', 'microservice-mining');
    formData.append('environmentUrl', environment.apiBaseUrl);
    return formData;
  }

  private createMiningHeaders(): HttpHeaders {
    return new HttpHeaders({
      'access-token': this.api.authSE?.localStorageToken
    });
  }

  private handleMiningSuccess(response: MiningResponse): void {
    let combinedResults: AIAssistantResult[] = [];

    for (const item of response.content) {
      if (item?.text) {
        try {
          const parsedText = JSON.parse(item.text);
          if (parsedText?.results?.length > 0) {
            combinedResults = combinedResults.concat(parsedText.results);
          }
        } catch (parseError) {
          console.error('Error parsing text:', parseError);
        }
      }
    }

    if (combinedResults.length === 0) {
      this.createResultManagementService.analyzingDocument.set(false);
      this.createResultManagementService.noResults.set(true);
      return;
    }

    const mappedResults = this.mapResultRawAiToAIAssistantResult(combinedResults);
    this.createResultManagementService.items.set(mappedResults);
    this.createResultManagementService.documentAnalyzed.set(true);
  }

  private handleMiningError(error: any): void {
    console.error('Error during file mining:', error);
    this.handleError('Error processing file content');
  }

  private handleError(message: string): void {
    console.error(message);
    this.resetAnalysisState();
    this.customizedAlertsFeSE.show({
      id: 'confirm-delete-item',
      title: message,
      description: 'Error processing file content. Please try again.',
      status: 'error'
    });
  }

  private resetAnalysisState(): void {
    this.createResultManagementService.analyzingDocument.set(false);
    this.aiLoadingStateService.stopLoadingProgress();
  }

  onPageChange(event: PaginatorState) {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 5);
  }

  private mapResultRawAiToAIAssistantResult(results: AIAssistantResult[]): AIAssistantResult[] {
    return results.map(result => ({
      indicator: result.indicator,
      title: result.title,
      description: result.description,
      keywords: result.keywords,
      geoscope: result.geoscope ?? [],
      training_type: result.training_type,
      length_of_training: result.length_of_training,
      start_date: result.start_date,
      end_date: result.end_date,
      degree: result.degree,
      delivery_modality: result.delivery_modality,
      total_participants: result.total_participants,
      evidence_for_stage: result.evidence_for_stage,
      policy_type: result.policy_type,
      alliance_main_contact_person_first_name: result.alliance_main_contact_person_first_name,
      alliance_main_contact_person_last_name: result.alliance_main_contact_person_last_name,
      stage_in_policy_process: result.stage_in_policy_process,
      male_participants: result.male_participants ?? 0,
      female_participants: result.female_participants ?? 0,
      non_binary_participants: result.non_binary_participants ?? '0',
      // Innovation Development fields
      innovation_nature: result.innovation_nature,
      innovation_type: result.innovation_type,
      assess_readiness: result.assess_readiness,
      anticipated_users: result.anticipated_users,
      organization_type: result.organization_type,
      organization_sub_type: result.organization_sub_type,
      organizations: result.organizations,
      innovation_actors_detailed: result.innovation_actors_detailed
    }));
  }
}
