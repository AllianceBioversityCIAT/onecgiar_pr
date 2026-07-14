import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HlmButton } from '@spartan/button';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-ai-feedback',
  imports: [CommonModule, ButtonModule, HlmButton, CustomFieldsModule],
  standalone: true,
  templateUrl: './ai-feedback.component.html',
  styleUrl: './ai-feedback.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiFeedbackComponent {
  loadingFeedback = signal<boolean>(false);
  feedbackSent = signal<boolean>(false);
  lastFeedbackType = signal<'good' | 'bad' | null>(null);
  feedbackType = signal<'good' | 'bad' | null>(null);
  body = signal<{ feedbackText: string }>({ feedbackText: '' });
  badTypes = signal<{ id: number; name: string }[]>([
    {
      id: 1,
      name: 'Incorrect'
    },
    {
      id: 2,
      name: 'Missing'
    },
    {
      id: 3,
      name: 'Irrelevant'
    },
    {
      id: 4,
      name: 'Other'
    }
  ]);
  selectedType = signal<string[]>([]);

  // Feedback panel overlay state (replaces PrimeNG p-popover)
  feedbackOpen = signal<boolean>(false);
  panelTop = 0;
  panelLeft = 0;

  selectType(type: string) {
    if (this.selectedType().includes(type)) {
      this.selectedType.update(types => types.filter(t => t !== type));
    } else {
      this.selectedType.update(types => [...types, type]);
    }
  }

  toggleFeedback(event: Event, type: 'good' | 'bad') {
    event.stopPropagation();
    if (this.feedbackType() === type) {
      this.feedbackOpen.set(false);
      this.feedbackType.set(null);
      this.selectedType.set([]);
    } else {
      this.feedbackType.set(type);
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.panelTop = rect.bottom + 8;
      this.panelLeft = rect.right;
      this.feedbackOpen.set(true);
      this.selectedType.set([]);
      this.body.set({ feedbackText: '' });
    }
  }

  closeFeedbackPanel() {
    this.selectedType.set([]);
    this.feedbackOpen.set(false);
    this.feedbackType.set(null);
    this.body.update(b => ({ ...b, feedbackText: '' }));
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.feedbackOpen()) this.closeFeedbackPanel();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.feedbackOpen()) this.closeFeedbackPanel();
  }
  async submitFeedback() {
    if (this.feedbackType() === 'bad' && (!this.selectedType().length || !this.body().feedbackText)) {
      return;
    }

    this.loadingFeedback.set(true);

    setTimeout(() => {
      this.loadingFeedback.set(false);
      this.feedbackSent.set(true);
      this.lastFeedbackType.set(this.feedbackType());
      this.closeFeedbackPanel();
    }, 2000);
  }

  isRequired() {
    return this.feedbackType() === 'bad';
  }
}
