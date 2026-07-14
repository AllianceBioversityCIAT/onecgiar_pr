import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';
import { environment } from '../../../../../environments/environment';

interface ScoreOption {
  id: number;
  title: string;
  name?: string;
}

interface AdUser {
  display_name: string;
  mail: string;
  title: string;
}

const DAC_AREAS = [
  { key: 'gender', label: 'Gender', dtoKey: 'gender_tag_level_id' },
  { key: 'climate_change', label: 'Climate change', dtoKey: 'climate_change_tag_level_id' },
  { key: 'nutrition', label: 'Nutrition', dtoKey: 'nutrition_tag_level_id' },
  { key: 'environmental_biodiversity', label: 'Environmental / Biodiversity', dtoKey: 'environmental_biodiversity_tag_level_id' },
  { key: 'poverty', label: 'Poverty', dtoKey: 'poverty_tag_level_id' },
] as const;

const TAG_LEVELS = [
  { value: 1, label: 'Not Targeted' },
  { value: 2, label: 'Significant' },
  { value: 3, label: 'Principal' },
];

@Component({
  selector: 'app-section-general-info',
  imports: [FormsModule, FormSkeletonComponent],
  templateUrl: './section-general-info.component.html',
  styleUrl: './section-general-info.component.scss'
})
export class SectionGeneralInfoComponent implements OnInit {
  private readonly autoSaveService = inject(BilateralAutoSaveService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly creationService = inject(BilateralCreationService);
  selectedSubScores = signal<Record<string, number[]>>({});
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  title = signal('');
  description = signal('');
  leadContactPerson = signal('');
  leadContactSearchQuery = '';
  leadContactResults: AdUser[] = [];
  leadContactSelected: AdUser | null = null;
  isSearchingLeads = false;

  showAllFields = signal(this.loadShowAllFromStorage());

  dacAreas = DAC_AREAS;
  tagLevels = signal(TAG_LEVELS.map(l => ({ ...l })));
  impactAreaSubScores = signal<Record<string, ScoreOption[]>>({});
  selectedDacLevels = signal<Record<string, number>>({});
  isLoadingDac = signal(true);

  private leadSearchSubject = new Subject<string>();

  constructor() {
    this.autoSaveService.registerField('title', 'text');
    this.autoSaveService.registerField('description', 'text');
    this.autoSaveService.registerField('lead_contact_person', 'text');

    for (const area of DAC_AREAS) {
      this.autoSaveService.registerField(area.dtoKey, 'select');
    }

    effect(() => {
      const t = this.title();
      const d = this.description();
      const filled = (t.trim() ? 1 : 0) + (d.trim() ? 1 : 0);
      this.mdsTracker.updateSection('general-info', filled);
    });

    effect(() => {
      const st = this.creationService.resultTitle();
      if (st) { this.title.set(st); }
    });
    effect(() => {
      const sd = this.creationService.resultDescription();
      if (sd) { this.description.set(sd); }
    });
    effect(() => {
      const lc = this.creationService.resultLeadContact();
      if (lc) {
        this.leadContactPerson.set(lc);
        this.leadContactSearchQuery = lc;
        this.leadContactSelected = { display_name: lc, mail: '', title: '' };
        this.showAllFields.set(true);
      }
    });

    effect(() => {
      const levels = this.creationService.resultDacLevels();
      const keys = Object.keys(levels);
      if (keys.length > 0) {
        this.selectedDacLevels.set(levels);
        this.showAllFields.set(true);
      }
    });

    effect(() => {
      const subs = this.creationService.resultDacSubScores();
      this.selectedSubScores.set(subs);
    });

    this.leadSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((query: string) => {
        if (query.length < 3) {
          this.leadContactResults = [];
          return EMPTY;
        }
        this.isSearchingLeads = true;
        return this.http.get<any>(`${environment.apiBaseUrl}api/ad-users/search?query=${encodeURIComponent(query)}`);
      })
    ).subscribe({
      next: ({ response }) => {
        this.isSearchingLeads = false;
        this.leadContactResults = (response ?? []).filter((u: AdUser) => u.mail && !u.mail.includes('test'));
      },
      error: () => { this.isSearchingLeads = false; this.leadContactResults = []; }
    });
  }

  ngOnInit(): void {
    this.loadDacOptions();
  }

  private loadDacOptions(): void {
    this.http.get<any>(`${environment.apiBaseUrl}api/results/gender-tag-levels/all`).subscribe({
      next: ({ response }) => {
        if (response) {
          this.tagLevels.set(response.map((r: any) => ({ value: Number(r.id), label: r.title })));
        }
        this.isLoadingDac.set(false);
      },
      error: () => { this.isLoadingDac.set(false); }
    });

    this.http.get<any>(`${environment.apiBaseUrl}api/results/impact-areas-scores-components/all`).subscribe({
      next: ({ response }) => {
        if (response && Array.isArray(response)) {
          const scores: Record<string, ScoreOption[]> = {};
          for (const item of response) {
            if (!item.is_active) continue;
            const key = DAC_AREAS.find(a => this.matchArea(a.key, item.impact_area))?.key;
            if (!key) continue;
            if (!scores[key]) scores[key] = [];
                scores[key].push({ id: Number(item.id), title: item.name, name: item.name });
          }
          this.impactAreaSubScores.set(scores);
        }
      },
      error: (err) => {
        console.error('Failed to load impact area scores:', err);
      }
    });
  }

  private matchArea(key: string, impactArea: string): boolean {
    const map: Record<string, string> = {
      gender: 'Gender', climate_change: 'Climate', nutrition: 'Nutrition',
      environmental_biodiversity: 'Environmental', poverty: 'Poverty',
    };
    return map[key] === impactArea;
  }

  onTitleChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.title.set(value);
    this.autoSaveService.updateField('title', value, 'text');
  }

  onTitleBlur(): void { this.autoSaveService.notifyBlur('title', this.title()); }

  onDescriptionChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.description.set(value);
    this.autoSaveService.updateField('description', value, 'text');
  }

  onDescriptionBlur(): void { this.autoSaveService.notifyBlur('description', this.description()); }

  onLeadContactSearch(query: string): void {
    this.leadContactSearchQuery = query;
    this.leadContactSelected = null;
    this.leadSearchSubject.next(query);
  }

  selectLeadContact(user: AdUser): void {
    this.leadContactSelected = user;
    this.leadContactSearchQuery = user.display_name;
    this.leadContactResults = [];
    this.leadContactPerson.set(user.display_name);
    this.autoSaveService.updateField('lead_contact_person', user.display_name, 'text');
  }

  clearLeadContact(): void {
    this.leadContactSelected = null;
    this.leadContactSearchQuery = '';
    this.leadContactResults = [];
    this.leadContactPerson.set('');
    this.autoSaveService.updateField('lead_contact_person', '', 'text');
  }

  onLeadContactBlur(): void {
    setTimeout(() => { this.leadContactResults = []; }, 200);
  }

  onDacTagChange(areaKey: string, value: number): void {
    const numValue = Number(value);
    this.selectedDacLevels.update(s => ({ ...s, [areaKey]: numValue }));
    const area = DAC_AREAS.find(a => a.key === areaKey);
    if (area) {
      this.autoSaveService.updateField(area.dtoKey, numValue, 'select');
    }
  }

  toggleSubScore(areaKey: string, scoreId: number): void {
    const current = [...(this.selectedSubScores()[areaKey] ?? [])];
    const idx = current.indexOf(scoreId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(scoreId);
    }
    this.creationService.setDacSubScores(areaKey, current);

    const allScores = this.creationService.resultDacSubScores();
    this.autoSaveService.updateFieldsBatch({
      gender_impact_area_ids: allScores['gender'] ?? [],
      climate_impact_area_ids: allScores['climate_change'] ?? [],
      nutrition_impact_area_ids: allScores['nutrition'] ?? [],
      environmental_biodiversity_impact_area_ids: allScores['environmental_biodiversity'] ?? [],
      poverty_impact_area_ids: allScores['poverty'] ?? [],
    });
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    this.saveShowAllToStorage();
  }

  private getResultId(): number | null {
    return Number(this.route.snapshot.params['id']) || null;
  }

  private showAllStorageKey(): string {
    const rid = this.getResultId();
    return rid ? `bp_extra_${rid}_general-info` : 'bp_extra_0_general-info';
  }

  private loadShowAllFromStorage(): boolean {
    try {
      return localStorage.getItem(this.showAllStorageKey()) === 'true';
    } catch {
      return false;
    }
  }

  private saveShowAllToStorage(): void {
    try {
      localStorage.setItem(this.showAllStorageKey(), String(this.showAllFields()));
    } catch { /* ignore */ }
  }

  get titleStatus(): string { return this.autoSaveService.fieldStatus()['title'] ?? 'idle'; }
  get descriptionStatus(): string { return this.autoSaveService.fieldStatus()['description'] ?? 'idle'; }
  get leadContactStatus(): string { return this.autoSaveService.fieldStatus()['lead_contact_person'] ?? 'idle'; }
}
