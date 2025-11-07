import { Component, Output, EventEmitter, inject } from '@angular/core';
import { PrRoute, resultDetailRouting } from '../../../../../shared/routing/routing-data';
import { ResultLevelService } from '../../result-creator/services/result-level.service';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { GreenChecksService } from '../../../../../shared/services/global/green-checks.service';
import { SubmissionModalService } from '../components/submission-modal/submission-modal.service';
import { DataControlService } from '../../../../../shared/services/data-control.service';
import { UnsubmitModalService } from '../components/unsubmit-modal/unsubmit-modal.service';
import { RolesService } from '../../../../../shared/services/global/roles.service';
import { AiReviewService } from '../../../../../shared/services/api/ai-review.service';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss'],
  standalone: false
})
export class PanelMenuComponent {
  @Output() copyEvent = new EventEmitter();
  navigationOptions: PrRoute[] = resultDetailRouting;
  aiReviewSE = inject(AiReviewService);
  aiReviewButtonState: 'idle' | 'loading' | 'completed' = 'idle';

  constructor(
    public rolesSE: RolesService,
    public resultLevelSE: ResultLevelService,
    public resultsListSE: ResultsApiService,
    public api: ApiService,
    public greenChecksSE: GreenChecksService,
    public submissionModalSE: SubmissionModalService,
    public unsubmitModalSE: UnsubmitModalService,
    public dataControlSE: DataControlService
  ) {}

  async onAIReviewClick() {
    if (this.aiReviewButtonState !== 'idle') return;

    this.aiReviewButtonState = 'loading';

    try {
      await this.aiReviewSE.POST_createSession();

      // Mostrar animación de completado
      this.aiReviewButtonState = 'completed';

      // Esperar a que termine la animación antes de abrir el modal
      setTimeout(() => {
        this.aiReviewSE.showAiReview.set(true);
        this.aiReviewButtonState = 'idle';
      }, 600);
    } catch (error) {
      console.error('Error creating AI session:', error);
      this.aiReviewButtonState = 'idle';
    }
  }

  hideKP(navOption) {
    if (!this.api.dataControlSE.isKnowledgeProduct) return false;
    const hideInKP = [];

    if (hideInKP.length === 0) return false;

    return Boolean(hideInKP.find(option => option == navOption.path));
  }

  get green_checks_string() {
    return JSON.stringify(this.api.dataControlSE.green_checks);
  }

  validateMember(myInitiativesList) {
    const initFinded = myInitiativesList.find(init => init?.initiative_id == this.dataControlSE?.currentResult?.initiative_id);

    if (!initFinded) return 6;

    return initFinded?.role === 'Member' ? 6 : 1;
  }
}
