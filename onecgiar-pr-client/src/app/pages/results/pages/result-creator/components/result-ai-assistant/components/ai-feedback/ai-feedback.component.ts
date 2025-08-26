import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Popover, PopoverModule } from 'primeng/popover';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-ai-feedback',
  imports: [CommonModule, ButtonModule, PopoverModule, CustomFieldsModule],
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

  @ViewChild('feedbackPanel') feedbackPanel!: Popover;

  selectType(type: string) {
    if (this.selectedType().includes(type)) {
      this.selectedType.update(types => types.filter(t => t !== type));
    } else {
      this.selectedType.update(types => [...types, type]);
    }
  }

  toggleFeedback(event: Event, type: 'good' | 'bad') {
    if (this.feedbackType() === type) {
      this.feedbackPanel.hide();
      this.feedbackType.set(null);
      this.selectedType.set([]);
    } else {
      this.feedbackType.set(type);
      this.feedbackPanel.show(event);
      this.selectedType.set([]);
      this.body.set({ feedbackText: '' });

      if (this.feedbackPanel.container) {
        this.feedbackPanel.align();
      }
    }
  }

  closeFeedbackPanel() {
    this.selectedType.set([]);
    this.feedbackPanel.hide();
    this.feedbackType.set(null);
    this.body.update(b => ({ ...b, feedbackText: '' }));
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
