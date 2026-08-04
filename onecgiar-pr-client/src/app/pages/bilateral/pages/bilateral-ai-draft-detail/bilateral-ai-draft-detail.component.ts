import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
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
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);

  showPromoteDialog = signal(false);
  showDiscardDialog = signal(false);

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
    if (this.draft) {
      this.bilateralAiService.discardDraft(this.draft.id);
    }
    this.showDiscardDialog.set(false);
  }

  onDiscardCancel(): void {
    this.showDiscardDialog.set(false);
  }
}
