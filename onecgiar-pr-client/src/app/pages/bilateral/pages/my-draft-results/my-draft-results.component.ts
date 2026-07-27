import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-my-draft-results',
  imports: [CommonModule, RouterModule],
  templateUrl: './my-draft-results.component.html',
  styleUrl: './my-draft-results.component.scss',
})
export class MyDraftResultsComponent implements OnInit {
  readonly bilateralAiService = inject(BilateralAiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  ngOnInit(): void {
    this.bilateralAiService.loadAllDrafts();
  }

  get drafts(): BilateralAiDraft[] {
    return this.bilateralAiService.draftList().filter(d => d.status === 'draft');
  }

  get hasDrafts(): boolean {
    return this.drafts.length > 0;
  }

  getDraftDocumentNames(draft: BilateralAiDraft): string {
    const names = draft.evidence.filter(e => e.source_type === 'DOCUMENT').map(e => e.file_name).filter(Boolean);
    if (names.length <= 2) return names.join(', ');
    return `${names[0]}, ${names[1]} +${names.length - 2} more`;
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

  getCompletenessLabel(pct: number): string {
    if (pct === 0) return 'Empty';
    if (pct >= 100) return 'Complete';
    return `${pct}%`;
  }

  getCompletenessClass(pct: number): string {
    if (pct === 0) return 'mdr-pct--empty';
    if (pct >= 100) return 'mdr-pct--complete';
    return 'mdr-pct--partial';
  }

  onReview(draft: BilateralAiDraft): void {
    void this.router.navigate(['/bilateral/drafts', draft.id]);
  }

  onPromote(draft: BilateralAiDraft): void {
    if (!confirm(`Promote "${draft.title}" to a result? This will create a new bilateral result.`)) return;
    this.bilateralAiService.promoteDraft(draft.id);
  }

  onDiscard(draft: BilateralAiDraft): void {
    if (!confirm(`Discard "${draft.title}"? This cannot be undone.`)) return;
    this.bilateralAiService.discardDraft(draft.id);
  }
}
