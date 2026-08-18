import { Component, inject, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrTooltipDirectiveModule } from '../../../../shared/directives/pr-tooltip-directive.module';
import { UserSearchService } from '../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { User } from '../../../results/pages/result-detail/pages/rd-general-information/models/userSearchResponse';
import { environment } from '../../../../../environments/environment';

interface ScoreOption {
  id: number;
  title: string;
  name?: string;
}

/** Plain body shape `<app-lead-contact-person-field>` expects and mutates in place. */
interface LeadContactBody {
  lead_contact_person: string | null;
  lead_contact_person_data: User | null;
}

const DAC_AREAS = [
  {
    key: 'gender',
    label: 'Gender equality, youth and social inclusion tag',
    dtoKey: 'gender_tag_level_id',
    tooltip: `<strong>Gender equality, youth and social inclusion</strong>
      <ul>
        <li><strong>Example topics:</strong> Empowering women and youth, encouraging women and youth entrepreneurship, and addressing socio-political barriers to social inclusion in food systems; ensuring equal access to resources; and meeting the specific crop and breed requirements and preferences of women, youth, and disadvantaged groups.</li>
        <li><strong>Collective global targets:</strong> Close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems; and offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
        <li><strong>Note:</strong> Additional guidance on scoring for gender equality is available in the <a href="https://docs.google.com/document/d/1krxwqVsmCfiQREh-DwGNcS72EPYRA7cn/edit?usp=sharing&ouid=100701138371542982320&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer">result-level Impact Area scoring guidance</a>.</li>
      </ul>`,
  },
  {
    key: 'climate_change',
    label: 'Climate adaptation and mitigation tag',
    dtoKey: 'climate_change_tag_level_id',
    tooltip: `<strong>Climate adaptation and mitigation</strong>
      <ul>
        <li><strong>Example topics:</strong> Generating scientific evidence on the impact of climate change on food, land and water systems, and vice versa; developing evidence-based solutions that support climate action; enhancing adaptive capacity while reducing GHG emissions; providing climate-informed services; developing climate-resilient crop varieties and breeds; securing genetic resources; and improving methods such as modeling and forecasts.</li>
        <li><strong>Collective global targets:</strong> Turn agriculture and forest systems into a net sink for carbon by 2050; equip 500 million small-scale producers to be more resilient by 2030; and support countries in implementing National Adaptation Plans and Nationally Determined Contributions.</li>
      </ul>`,
  },
  {
    key: 'nutrition',
    label: 'Nutrition, health and food security tag',
    dtoKey: 'nutrition_tag_level_id',
    tooltip: `<strong>Nutrition, health and food security</strong>
      <ul>
        <li><strong>Example topics:</strong> Improving diets, nutrition, and food security (affordability, accessibility, desirability, and stability); human health; and managing zoonotic diseases, food safety, and antimicrobial resistance.</li>
        <li><strong>Collective global targets:</strong> End hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food; and reduce cases of foodborne illness and zoonotic disease by one third.</li>
      </ul>`,
  },
  {
    key: 'environmental_biodiversity',
    label: 'Environmental health and biodiversity tag',
    dtoKey: 'environmental_biodiversity_tag_level_id',
    tooltip: `<strong>Environmental health and biodiversity</strong>
      <ul>
        <li><strong>Example topics:</strong> Staying within planetary boundaries for natural resource use and biodiversity; improving management of water, land, soil, nutrients, waste, and pollution; conserving biodiversity through ex situ or in situ conservation; and breeding to reduce environmental footprint.</li>
        <li><strong>Collective global targets:</strong> Stay within planetary and regional environmental boundaries; and maintain the genetic diversity of seed varieties, cultivated plants, farmed and domesticated animals, and their related wild species through soundly managed genebanks.</li>
      </ul>`,
  },
  {
    key: 'poverty',
    label: 'Poverty reduction, livelihoods and jobs tag',
    dtoKey: 'poverty_tag_level_id',
    tooltip: `<strong>Poverty reduction, livelihoods and jobs</strong>
      <ul>
        <li><strong>Example topics:</strong> Improving social protection and employment opportunities by supporting access to resources and markets; developing resilient, income-generating agriculture for small farmers; and reducing poverty through adoption of new varieties and breeds with better yields.</li>
        <li><strong>Collective global targets:</strong> Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP); and reduce by at least half the proportion of people living in poverty in all its dimensions, according to national definitions.</li>
      </ul>`,
  },
] as const;

const TAG_LEVELS = [
  { value: 1, label: '(0) Not Targeted' },
  { value: 2, label: '(1) Significant' },
  { value: 3, label: '(2) Principal' },
];

@Component({
  selector: 'app-section-general-info',
  imports: [FormsModule, FormSkeletonComponent, CustomFieldsModule, PrTooltipDirectiveModule],
  templateUrl: './section-general-info.component.html',
  styleUrl: './section-general-info.component.scss'
})
export class SectionGeneralInfoComponent implements OnInit, OnDestroy {
  private readonly autoSaveService = inject(BilateralAutoSaveService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly userSearchService = inject(UserSearchService);
  selectedSubScores = signal<Record<string, number[]>>({});
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  title = signal('');
  description = signal('');

  /**
   * Reassigned (never mutated) whenever the loaded result's lead contact changes,
   * so `<app-lead-contact-person-field>`'s `ngOnChanges` (which only fires on
   * reference change) picks up server-loaded data. Each instance's getters/setters
   * close over their own backing values; the setters are the child's only way to
   * report a user-driven selection back to us (it has no `@Output()`), and — since
   * `selectUser()`/`clearContact()` always assign `lead_contact_person` before
   * `lead_contact_person_data` — the `lead_contact_person_data` setter is the
   * single deterministic point where both values are guaranteed current, so
   * that's where autosave + MDS-tracker updates fire.
   */
  leadContactBody = signal<LeadContactBody>(this.makeLeadContactBody(null, null));

  showAllFields = signal(this.loadShowAllFromStorage());

  dacAreas = DAC_AREAS;
  tagLevels = signal(TAG_LEVELS.map(l => ({ ...l })));
  impactAreaSubScores = signal<Record<string, ScoreOption[]>>({});
  selectedDacLevels = signal<Record<string, number>>({});
  isLoadingDac = signal(true);

  constructor() {
    this.autoSaveService.registerField('title', 'text');
    this.autoSaveService.registerField('description', 'text');
    this.autoSaveService.registerField('lead_contact_person', 'text');

    for (const area of DAC_AREAS) {
      this.autoSaveService.registerField(area.dtoKey, 'select');
    }

    // Reacts to title/description edits AND to leadContactBody being reassigned
    // on load (see makeLeadContactBody) — NOT to in-place mutation by the child,
    // which instead calls updateGeneralInfoMdsFields() directly from commit().
    effect(() => {
      this.title();
      this.description();
      this.leadContactBody();
      this.updateGeneralInfoMdsFields();
    });

    effect(() => {
      this.title.set(this.creationService.resultTitle());
    });
    effect(() => {
      this.description.set(this.creationService.resultDescription());
    });
    effect(() => {
      const lc = this.creationService.resultLeadContact();
      const lcData = this.creationService.resultLeadContactData();
      this.leadContactBody.set(this.makeLeadContactBody(lc || null, lcData));
    });

    effect(() => {
      const levels = this.creationService.resultDacLevels();
      this.selectedDacLevels.set(levels);
      if (Object.keys(levels).length > 0) {
        this.showAllFields.set(true);
      }
    });

    effect(() => {
      this.selectedSubScores.set(this.creationService.resultDacSubScores());
    });
  }

  ngOnInit(): void {
    this.loadDacOptions();
    // UserSearchService is app-wide (providedIn: 'root') — reset it so a
    // previous Result Detail visit or a different bilateral result can't leak
    // its selected/locked contact state into this one.
    this.resetUserSearchService();
  }

  ngOnDestroy(): void {
    this.resetUserSearchService();
  }

  private resetUserSearchService(): void {
    this.userSearchService.selectedUser = null;
    this.userSearchService.searchQuery = '';
    this.userSearchService.hasValidContact = true;
    this.userSearchService.showContactError = false;
  }

  /** Builds a fresh getter/setter-backed body; see the `leadContactBody` doc comment. */
  private makeLeadContactBody(name: string | null, data: User | null): LeadContactBody {
    let currentName = name;
    let currentData = data;
    const commit = () => this.updateGeneralInfoMdsFields();
    return {
      get lead_contact_person() { return currentName; },
      set lead_contact_person(v: string | null) { currentName = v; },
      get lead_contact_person_data() { return currentData; },
      set lead_contact_person_data(v: User | null) {
        currentData = v;
        commit();
      },
    } as LeadContactBody;
  }

  private updateGeneralInfoMdsFields(): void {
    const t = this.title();
    const d = this.description();
    const titleFilled = !this.isPlaceholderTitle(t) && !!t.trim();
    const descriptionFilled = !!d.trim();
    const body = this.leadContactBody();
    const leadContactFilled = !!body.lead_contact_person && !!body.lead_contact_person_data;

    this.mdsTracker.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: titleFilled },
      { key: 'description', label: 'Description', filled: descriptionFilled },
      { key: 'lead_contact_person', label: 'Lead Contact Person', filled: leadContactFilled },
    ]);

    this.autoSaveService.updateFieldsBatch({
      lead_contact_person: body.lead_contact_person,
      lead_contact_person_data: body.lead_contact_person_data,
    });
  }

  isPlaceholderTitle(title: string): boolean {
    return /^Bilateral Draft #\d+$/.test(title.trim());
  }

  private loadDacOptions(): void {
    this.http.get<any>(`${environment.apiBaseUrl}api/results/gender-tag-levels/all`).subscribe({
      next: ({ response }) => {
        if (response) {
          this.tagLevels.set(response.map((r: any) => ({ value: Number(r.id), label: r.description })));
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
            if (!scores[key]) {
              scores[key] = [];
            }
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

  onTitleChange(value: string): void {
    this.title.set(value);
    this.autoSaveService.updateField('title', value, 'text');
  }

  onTitleBlur(): void { this.autoSaveService.notifyBlur('title', this.title()); }

  onDescriptionChange(value: string): void {
    this.description.set(value);
    this.autoSaveService.updateField('description', value, 'text');
  }

  onDescriptionBlur(): void { this.autoSaveService.notifyBlur('description', this.description()); }

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
