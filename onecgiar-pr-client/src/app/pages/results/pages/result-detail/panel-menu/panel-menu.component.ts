import { Component, inject, effect, signal, computed } from '@angular/core';
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
import { FieldsManagerService } from '../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss'],
  standalone: false
})
export class PanelMenuComponent {
  navigationOptions: PrRoute[] = resultDetailRouting;
  aiReviewSE = inject(AiReviewService);
  fieldsManagerSE = inject(FieldsManagerService);
  private lastKnownPortfolioSignal = signal<string | null>(null);

  constructor(
    public rolesSE: RolesService,
    public resultLevelSE: ResultLevelService,
    public resultsListSE: ResultsApiService,
    public api: ApiService,
    public greenChecksSE: GreenChecksService,
    public submissionModalSE: SubmissionModalService,
    public unsubmitModalSE: UnsubmitModalService,
    public dataControlSE: DataControlService
  ) {
    // Track portfolio changes to maintain last known portfolio for skeleton
    effect(() => {
      const portfolio = this.fieldsManagerSE.portfolioAcronym();
      if (portfolio) {
        this.lastKnownPortfolioSignal.set(portfolio);
      }
    });
  }

  isLoading = computed(() => !this.fieldsManagerSE.portfolioAcronym());

  skeletonLinesCount = computed(() => {
    const portfolio = this.fieldsManagerSE.portfolioAcronym() || this.lastKnownPortfolioSignal();
    return portfolio === 'P25' ? 5 : 7;
  });

  getSkeletonArray = computed(() => {
    return Array.from({ length: this.skeletonLinesCount() }, (_, i) => i + 1);
  });

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
