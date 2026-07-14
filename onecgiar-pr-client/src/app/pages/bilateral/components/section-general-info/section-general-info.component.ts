import { Component, inject, signal, effect } from '@angular/core';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';

@Component({
  selector: 'app-section-general-info',
  imports: [],
  templateUrl: './section-general-info.component.html',
  styleUrl: './section-general-info.component.scss'
})
export class SectionGeneralInfoComponent {
  private readonly autoSaveService = inject(BilateralAutoSaveService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly creationService = inject(BilateralCreationService);

  title = signal('');
  description = signal('');
  leadContactPerson = signal('');
  isKrs = signal(false);
  isDiscontinued = signal(false);
  showAllFields = signal(false);

  private _titleLoaded = false;
  private _descriptionLoaded = false;

  constructor() {
    this.autoSaveService.registerField('title', 'text');
    this.autoSaveService.registerField('description', 'text');

    effect(() => {
      const t = this.title();
      const d = this.description();
      const filled = (t.trim() ? 1 : 0) + (d.trim() ? 1 : 0);
      this.mdsTracker.updateSection('general-info', filled);
    });

    effect(() => {
      const st = this.creationService.resultTitle();
      if (st && !this._titleLoaded) {
        this._titleLoaded = true;
        this.title.set(st);
      }
    });

    effect(() => {
      const sd = this.creationService.resultDescription();
      if (sd && !this._descriptionLoaded) {
        this._descriptionLoaded = true;
        this.description.set(sd);
      }
    });
  }

  onTitleChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.title.set(value);
    this.autoSaveService.updateField('title', value, 'text');
  }

  onTitleBlur(): void {
    this.autoSaveService.notifyBlur('title', this.title());
  }

  onDescriptionChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.description.set(value);
    this.autoSaveService.updateField('description', value, 'text');
  }

  onDescriptionBlur(): void {
    this.autoSaveService.notifyBlur('description', this.description());
  }

  onLeadContactChange(event: Event): void {
    this.leadContactPerson.set((event.target as HTMLInputElement).value);
  }

  toggleKrs(): void {
    this.isKrs.update(v => !v);
  }

  toggleDiscontinued(): void {
    this.isDiscontinued.update(v => !v);
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
  }

  get titleStatus(): string {
    return this.autoSaveService.fieldStatus()['title'] ?? 'idle';
  }

  get descriptionStatus(): string {
    return this.autoSaveService.fieldStatus()['description'] ?? 'idle';
  }
}
