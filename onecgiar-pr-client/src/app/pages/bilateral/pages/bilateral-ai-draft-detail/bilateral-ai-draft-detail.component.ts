import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { isCenterMember } from '../../services/bilateral-center-membership.util';
import { DraftResultCardComponent } from './components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from './components/draft-evidence-list/draft-evidence-list.component';

@Component({
  selector: 'app-bilateral-ai-draft-detail',
  imports: [CommonModule, RouterModule, PrDialogComponent, DraftResultCardComponent, DraftEvidenceListComponent],
  templateUrl: './bilateral-ai-draft-detail.component.html',
  styleUrl: './bilateral-ai-draft-detail.component.scss',
})
export class BilateralAiDraftDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rolesSE = inject(RolesService);
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);

  showPromoteDialog = signal(false);
  showDiscardDialog = signal(false);

  /**
   * `ASC-T-5` (`ASC-R-15`) — see the sibling gate's doc in `my-draft-results.component.ts`.
   * Reads `rolesVersion` first: `RolesService.roles` is a plain property, invisible to the signal
   * graph on its own, so without this the computed would cache whatever `getMyCenters()` answered
   * on the FIRST render and never react to a roles payload landing afterwards (the same class of
   * bug `isCenterUserOfLeadCenter()` guards against, `bilateral-result-creator.component.ts`).
   */
  readonly isCenterMember = computed(() => {
    this.rolesSE.rolesVersion;
    return isCenterMember(this.rolesSE.getMyCenters(), this.ctx.centerId(), this.ctx.centerAcronym());
  });

  draftId: number | null = null;
  draft: BilateralAiDraft | null = null;
  error: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('draftId');
    if (idParam) {
      this.draftId = Number(idParam);
      this.loadDraft();
    }
  }

  private loadDraft(): void {
    if (this.draftId === null) return;
    this.bilateralAiService.getDraft(this.draftId).subscribe({
      next: ({ response }) => {
        this.draft = response;
      },
      error: () => {
        this.error = 'Failed to load draft. It may have been removed or you may not have permission to view it.';
      },
    });
  }

  getDraftTitle(): string {
    return this.draft?.extracted_mds?.['title'] ?? 'Untitled Draft';
  }

  onPromoteClick(): void {
    this.showPromoteDialog.set(true);
  }

  onPromoteConfirm(): void {
    // The promote request rewrites the underlying result and flips the draft to
    // discarded; a second click while the first is in flight replays the whole
    // population step (duplicate partners/geo rows) and then 404s because the
    // draft is already gone. One click, one promote.
    if (this.bilateralAiService.isPromoting()) return;
    if (this.draft) {
      this.bilateralAiService.promoteDraft(this.draft.id);
    }
    this.showPromoteDialog.set(false);
  }

  onPromoteCancel(): void {
    this.showPromoteDialog.set(false);
  }

  onDiscardClick(): void {
    this.showDiscardDialog.set(true);
  }

  onDiscardConfirm(): void {
    if (this.bilateralAiService.isPromoting()) return;
    if (this.draft) {
      this.bilateralAiService.discardDraft(this.draft.id);
    }
    this.showDiscardDialog.set(false);
  }

  onDiscardCancel(): void {
    this.showDiscardDialog.set(false);
  }
}
