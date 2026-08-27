import { Component, inject, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { DraftResultCardComponent } from '../bilateral-ai-draft-detail/components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from '../bilateral-ai-draft-detail/components/draft-evidence-list/draft-evidence-list.component';

@Component({
  selector: 'app-my-draft-results',
  imports: [
    CommonModule,
    RouterModule,
    HlmButton,
    PrDialogComponent,
    BilateralPageHeaderComponent,
    DraftResultCardComponent,
    DraftEvidenceListComponent,
    PrTooltipDirectiveModule,
  ],
  templateUrl: './my-draft-results.component.html',
  styleUrl: './my-draft-results.component.scss',
})
export class MyDraftResultsComponent implements OnInit, OnDestroy {
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);

  /**
   * P2-3316: plain-language notes for the three card actions. End users could not tell
   * Review / Promote / Delete apart from the labels alone, so each one states what happens
   * to the draft after the click. Wording matches the real behaviour, not the button name:
   * Review only opens the read-only preview aside, Promote creates the actual result and
   * navigates to it, Delete removes the draft for good.
   */
  readonly reviewTooltip =
    'Preview everything the AI extracted from your files, next to the source evidence it used. Nothing is saved or created — the draft stays in this list.';
  readonly promoteTooltip =
    'Turn this draft into a real bilateral result. You will be asked to confirm first; after that the draft leaves this list and the new result opens for you to complete.';
  readonly deleteTooltip =
    'Delete this draft and everything the AI extracted from it. You will be asked to confirm first, and it cannot be undone.';

  promoteTarget = signal<BilateralAiDraft | null>(null);
  discardTarget = signal<BilateralAiDraft | null>(null);
  selectedDraft = signal<BilateralAiDraft | null>(null);

  constructor() {
    effect(() => {
      document.body.style.overflow = this.selectedDraft() ? 'hidden' : '';
    });
  }

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

  getProgramLabel(draft: BilateralAiDraft): string {
    const code = draft.job?.program_code;
    if (!code) return '';
    return this.bilateralAiService.initiativeNameMap()[code] ?? code;
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

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
