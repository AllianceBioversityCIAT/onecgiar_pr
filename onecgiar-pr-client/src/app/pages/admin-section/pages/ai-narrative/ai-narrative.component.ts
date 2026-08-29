// @akili-spec changes/mass-reporting-flow
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { GlobalVariablesService } from '../../../../shared/services/global-variables.service';
import { PrToastService } from 'src/app/shared/components/pr-toast';

interface PendingParameterUpdate {
  name: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-ai-narrative',
  templateUrl: './ai-narrative.component.html',
  styleUrls: ['./ai-narrative.component.scss'],
  standalone: false
})
export class AiNarrativeComponent implements OnInit {
  aiNarrativeEnabled = false;
  previousAiNarrativeEnabled = false;
  aiNarrativePrompt = '';
  previousAiNarrativePrompt = '';
  isLoading = false;
  readonly promptDescription = 'Must include the {{aow}}, {{stats}} and {{hlos}} placeholders.';

  constructor(
    private messageService: PrToastService,
    public api: ApiService,
    public globalVariablesSE: GlobalVariablesService
  ) {}

  ngOnInit(): void {
    this.aiNarrativeEnabled = Boolean(this.globalVariablesSE.get.ai_narrative_enabled);
    this.previousAiNarrativeEnabled = this.aiNarrativeEnabled;
    this.aiNarrativePrompt = this.globalVariablesSE.get.ai_narrative_prompt ?? '';
    this.previousAiNarrativePrompt = this.aiNarrativePrompt;
  }

  get hasChanges(): boolean {
    return this.aiNarrativeEnabled !== this.previousAiNarrativeEnabled || this.aiNarrativePrompt !== this.previousAiNarrativePrompt;
  }

  onSave(): void {
    if (!this.hasChanges) {
      return;
    }

    const updates: PendingParameterUpdate[] = [];

    if (this.aiNarrativeEnabled !== this.previousAiNarrativeEnabled) {
      updates.push({ name: 'ai_narrative_enabled', label: 'AI narrative flag', value: this.aiNarrativeEnabled ? '1' : '0' });
    }

    if (this.aiNarrativePrompt !== this.previousAiNarrativePrompt) {
      updates.push({ name: 'ai_narrative_prompt', label: 'AI narrative prompt', value: this.aiNarrativePrompt });
    }

    this.isLoading = true;
    let pending = updates.length;
    let hadError = false;

    updates.forEach(update => {
      this.api.resultsSE.PUT_updateGlobalVariable({ name: update.name, value: update.value }).subscribe({
        next: () => {
          if (update.name === 'ai_narrative_enabled') {
            this.globalVariablesSE.get.ai_narrative_enabled = this.aiNarrativeEnabled;
            this.previousAiNarrativeEnabled = this.aiNarrativeEnabled;
          } else {
            this.globalVariablesSE.get.ai_narrative_prompt = this.aiNarrativePrompt;
            this.previousAiNarrativePrompt = this.aiNarrativePrompt;
          }
          pending -= 1;
          if (pending === 0) {
            this.isLoading = false;
            if (!hadError) {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'AI narrative settings updated' });
            }
          }
        },
        error: err => {
          console.error(err);
          hadError = true;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: `Error updating ${update.label}` });
          pending -= 1;
          if (pending === 0) {
            this.isLoading = false;
          }
        }
      });
    });
  }
}
