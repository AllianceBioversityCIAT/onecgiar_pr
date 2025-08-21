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

export interface Step {
  label: string;
  completed: boolean;
  inProgress: boolean;
  progress: number;
}

@Component({
  selector: 'app-result-ai-assistant',
  imports: [CommonModule, FormsModule, DialogModule, CustomFieldsModule, AiUploadFileComponent, AiNotDataFoundComponent],
  standalone: true,
  templateUrl: './result-ai-assistant.component.html',
  styleUrl: './result-ai-assistant.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultAiAssistantComponent implements OnInit {
  createResultManagementService = inject(CreateResultManagementService);
  api = inject(ApiService);

  initiatives = signal<Initiative[]>([]);
  steps = signal<Step[]>([
    { label: 'Uploading document', completed: false, inProgress: false, progress: 0 },
    { label: 'Reading content', completed: false, inProgress: false, progress: 0 },
    { label: 'Analyzing text', completed: false, inProgress: false, progress: 0 },
    { label: 'Finding relevant content', completed: false, inProgress: false, progress: 0 },
    { label: 'Generating response', completed: false, inProgress: false, progress: 0 }
  ]);
  activeIndex = signal<number>(0);

  ngOnInit() {
    this.getInitiatives();
  }

  getInitiatives() {
    const activePortfolio = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe(resp => {
      this.initiatives.set(resp.response);
    });
  }

  startProgress(): void {
    let currentStep = 0;

    this.runStep(currentStep);
    this.activeIndex.set(currentStep);
    currentStep++;

    const stepInterval = setInterval(() => {
      if (currentStep < this.steps().length) {
        this.runStep(currentStep);
        this.activeIndex.set(currentStep);
        currentStep++;
      } else {
        clearInterval(stepInterval);
      }
    }, this.getRandomInterval());
  }

  runStep(index: number): void {
    const step = this.steps()[index];
    step.inProgress = true;
    step.progress = 0;

    this.updateStep(index, step);

    requestAnimationFrame(() => {
      setTimeout(() => this.startProgressAnimation(index, step), 500);
    });
  }

  private startProgressAnimation(index: number, step: Step): void {
    const duration = this.getRandomInterval();
    const interval = 50;
    const increment = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      if (step.progress < 100) {
        step.progress = Math.min(step.progress + increment, 100);
        this.updateStep(index, step);
      } else {
        clearInterval(progressTimer);
        this.finishStep(index, step);
      }
    }, interval);
  }

  private finishStep(index: number, step: Step): void {
    setTimeout(() => {
      step.inProgress = false;
      step.completed = true;
      this.updateStep(index, step);
    }, 100);
  }

  private updateStep(index: number, step: Step): void {
    this.steps.update(steps => {
      steps[index] = { ...step };
      return [...steps];
    });
  }

  getRandomInterval(): number {
    return Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
  }

  handleAnalyzeFile() {
    this.createResultManagementService.analyzingDocument.set(true);

    setTimeout(() => {
      this.createResultManagementService.documentAnalyzed.set(true);
      this.createResultManagementService.noResults.set(false);
    }, 5000);

    // this.createResultManagementService.documentAnalyzed.set(true);
    // this.createResultManagementService.noResults.set(true);

    this.startProgress();
  }
}
