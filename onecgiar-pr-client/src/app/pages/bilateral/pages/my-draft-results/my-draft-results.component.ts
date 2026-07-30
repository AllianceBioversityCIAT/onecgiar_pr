import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { DraftResultCardComponent } from '../bilateral-ai-draft-detail/components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from '../bilateral-ai-draft-detail/components/draft-evidence-list/draft-evidence-list.component';

@Component({
  selector: 'app-my-draft-results',
  imports: [CommonModule, RouterModule, DialogModule, ButtonModule, BilateralPageHeaderComponent, DraftResultCardComponent, DraftEvidenceListComponent],
  templateUrl: './my-draft-results.component.html',
  styleUrl: './my-draft-results.component.scss',
})
export class MyDraftResultsComponent implements OnInit {
  readonly bilateralAiService = inject(BilateralAiService);
  private readonly messageService = inject(MessageService);
  readonly ctx = inject(BilateralContextService);

  promoteTarget = signal<BilateralAiDraft | null>(null);
  discardTarget = signal<BilateralAiDraft | null>(null);
  selectedDraft = signal<BilateralAiDraft | null>(null);

  ngOnInit(): void {
    this.bilateralAiService.loadAllDrafts();
  }

  get drafts(): BilateralAiDraft[] {
    return this.bilateralAiService.draftList();
  }

  get hasDrafts(): boolean {
    return this.drafts.length > 0;
  }

  getDraftTitle(draft: BilateralAiDraft): string {
    return draft.extracted_mds?.['title'] ?? 'Untitled Draft';
  }

  getDraftType(draft: BilateralAiDraft): string {
    return draft.extracted_mds?.['indicator'] ?? '';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  onReview(draft: BilateralAiDraft): void {
    this.selectedDraft.set(draft);
  }

  closeAside(): void {
    this.selectedDraft.set(null);
  }

  onPromoteClick(draft: BilateralAiDraft): void {
    this.promoteTarget.set(draft);
  }

  onPromoteConfirm(): void {
    const draft = this.promoteTarget();
    if (draft) {
      this.bilateralAiService.promoteDraft(draft.id);
    }
    this.promoteTarget.set(null);
    this.selectedDraft.set(null);
  }

  onPromoteCancel(): void {
    this.promoteTarget.set(null);
  }

  onDiscardClick(draft: BilateralAiDraft): void {
    this.discardTarget.set(draft);
  }

  onDiscardConfirm(): void {
    const draft = this.discardTarget();
    if (draft) {
      this.bilateralAiService.discardDraft(draft.id);
    }
    this.discardTarget.set(null);
    this.selectedDraft.set(null);
  }

  onDiscardCancel(): void {
    this.discardTarget.set(null);
  }
}
