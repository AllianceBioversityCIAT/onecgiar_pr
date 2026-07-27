import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';
import { DraftResultCardComponent } from './components/draft-result-card/draft-result-card.component';
import { DraftEvidenceListComponent } from './components/draft-evidence-list/draft-evidence-list.component';

@Component({
  selector: 'app-bilateral-ai-draft-detail',
  imports: [CommonModule, RouterModule, DraftResultCardComponent, DraftEvidenceListComponent],
  templateUrl: './bilateral-ai-draft-detail.component.html',
  styleUrl: './bilateral-ai-draft-detail.component.scss',
})
export class BilateralAiDraftDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly bilateralAiService = inject(BilateralAiService);
  private readonly messageService = inject(MessageService);

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

  onPromote(): void {
    if (!this.draft) return;
    if (!confirm(`Convert this AI draft into a bilateral result? The draft will be used as a starting point.`)) return;
    this.bilateralAiService.promoteDraft(this.draft.id);
  }

  onDiscard(): void {
    if (!this.draft) return;
    if (!confirm(`Discard this draft? All extracted data will be permanently deleted.`)) return;
    this.bilateralAiService.discardDraft(this.draft.id);
  }
}
