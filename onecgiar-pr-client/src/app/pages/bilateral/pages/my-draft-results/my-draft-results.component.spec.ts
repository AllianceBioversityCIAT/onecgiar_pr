import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { By } from '@angular/platform-browser';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { PrTooltipDirective } from '../../../../shared/directives/pr-tooltip.directive';
import { MyDraftResultsComponent } from './my-draft-results.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralAiDraft } from '../../services/bilateral-ai.interfaces';

/**
 * Shaped after a real `GET /api/bilateral/center/ai/drafts` row: the endpoint loads
 * `relations: { job: true, result: true }`, and TypeORM serialises the result's bigint/int ids as
 * strings — which is why `result_level_id` and `status_id` are quoted here.
 */
const draftStub = {
  id: 1,
  job_id: '3ce3462d-e229-49e7-ad53-302f3d0c36a0',
  result_id: 0,
  candidate_index: 0,
  extracted_mds: { title: 'A draft title', indicator: 'Capacity Sharing' },
  candidate_snapshot: null,
  mapping_warnings: null,
  is_discarded: false,
  created_date: new Date().toISOString(),
  last_updated_date: new Date().toISOString(),
  job: { job_id: '3ce3462d-e229-49e7-ad53-302f3d0c36a0', project_id: 7, program_code: 'SP01', created_date: new Date().toISOString(), result_count: 12 },
  result: { result_level_id: '4', status_id: '8' },
} as unknown as BilateralAiDraft;

describe('MyDraftResultsComponent', () => {
  let component: MyDraftResultsComponent;
  let fixture: ComponentFixture<MyDraftResultsComponent>;
  let bilateralAiService: BilateralAiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyDraftResultsComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PrToastService,
        BilateralAiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyDraftResultsComponent);
    component = fixture.componentInstance;
    bilateralAiService = TestBed.inject(BilateralAiService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format dates correctly', () => {
    expect(component.formatDate(new Date().toISOString())).toBe('Today');
  });

  describe('P2-3316 — explanatory notes on the card actions', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    const tooltipFor = (selector: string): PrTooltipDirective =>
      fixture.debugElement.query(By.css(selector)).injector.get(PrTooltipDirective);

    it('gives every action button a non-empty tooltip', () => {
      for (const selector of ['.mdr-btn--review', '.mdr-btn--promote', '.mdr-btn--discard']) {
        expect(tooltipFor(selector).text?.trim().length).toBeGreaterThan(0);
      }
    });

    it('tells the user Review only previews the draft, without creating anything', () => {
      const text = tooltipFor('.mdr-btn--review').text;
      expect(text).toBe(component.reviewTooltip);
      expect(text).toContain('Nothing is saved or created');
    });

    it('tells the user Promote turns the draft into a real result', () => {
      const text = tooltipFor('.mdr-btn--promote').text;
      expect(text).toBe(component.promoteTooltip);
      expect(text).toContain('real bilateral result');
    });

    it('warns the user Delete is permanent', () => {
      const text = tooltipFor('.mdr-btn--discard').text;
      expect(text).toBe(component.deleteTooltip);
      expect(text).toContain('cannot be undone');
    });

    it('labels the icon-only delete button for screen readers', () => {
      const button: HTMLButtonElement = fixture.debugElement.query(By.css('.mdr-btn--discard')).nativeElement;
      expect(button.getAttribute('aria-label')).toBe('Delete draft');
    });
  });

  describe('P2-3169 AC2 — the fields every draft card has to show', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    const textOf = (selector: string): string =>
      fixture.debugElement.query(By.css(selector))?.nativeElement.textContent.trim() ?? '';

    it('shows the suggested title and the suggested indicator category', () => {
      expect(textOf('.mdr-card-title')).toBe('A draft title');
      expect(textOf('.mdr-card-type')).toBe('Capacity Sharing');
    });

    it('shows the suggested result type as Output or Outcome, from result.result_level_id', () => {
      expect(component.getDraftLevel(draftStub)).toBe('Output');
      expect(textOf('.mdr-card-level')).toBe('Output');
      expect(component.getDraftLevel({ ...draftStub, result: { result_level_id: 3 } } as unknown as BilateralAiDraft)).toBe('Outcome');
    });

    it('renders no result-type chip when the payload carries no level', () => {
      bilateralAiService.draftList.set([{ ...draftStub, result: undefined } as unknown as BilateralAiDraft]);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('.mdr-card-level'))).toBeNull();
    });

    it('identifies the AI-Assistant session the draft came from', () => {
      const label = component.getSessionLabel(draftStub);
      expect(label).toContain('#3ce3462d');
      expect(label).toContain('Today');
      expect(textOf('.mdr-meta-session')).toBe(label);
    });

    it('keeps the full session id and its draft count in the session tooltip', () => {
      const tooltip = component.getSessionTooltip(draftStub);
      expect(tooltip).toContain('3ce3462d-e229-49e7-ad53-302f3d0c36a0');
      expect(tooltip).toContain('12 drafts');
    });

    it('shows the generation date', () => {
      expect(textOf('.mdr-date')).toBe('Today');
    });

    it('reads the draft status from the payload instead of hardcoding it', () => {
      expect(component.getDraftStatus(draftStub)).toBe('Draft');
      expect(textOf('.mdr-status')).toBe('Draft');
      expect(component.getDraftStatusClass(draftStub)).toContain('mdr-status--draft');

      const editing = { ...draftStub, result: { result_level_id: '4', status_id: 1 } } as unknown as BilateralAiDraft;
      expect(component.getDraftStatus(editing)).toBe('Editing');
      expect(component.getDraftStatusClass(editing)).toContain('mdr-status--editing');
    });

    it('falls back to Draft when the payload carries no status', () => {
      const noResult = { ...draftStub, result: undefined } as unknown as BilateralAiDraft;
      expect(component.getDraftStatus(noResult)).toBe('Draft');
      expect(component.getDraftStatusClass(noResult)).toContain('mdr-status--draft');
    });
  });

  describe('P2-3319 — filter the Drafts tab by project', () => {
    /** Three drafts across two projects, so a project filter has something to hide. */
    const draftOfProject = (id: number, projectId: number, title: string): BilateralAiDraft =>
      ({
        ...draftStub,
        id,
        extracted_mds: { title, indicator: 'Capacity Sharing' },
        job: { ...(draftStub as any).job, project_id: projectId },
      }) as unknown as BilateralAiDraft;

    const alpha = draftOfProject(1, 7, 'Alpha draft');
    const beta = draftOfProject(2, 7, 'Beta draft');
    const gamma = draftOfProject(3, 9, 'Gamma draft');

    beforeEach(() => {
      bilateralAiService.projectNameMap.set({ 7: 'PRJ-Seven', 9: 'PRJ-Nine' });
      bilateralAiService.draftList.set([alpha, beta, gamma]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    const renderedTitles = (): string[] =>
      fixture.debugElement.queryAll(By.css('.mdr-card-title')).map(node => node.nativeElement.textContent.trim());

    it('offers one option per project present in the drafts, named and alphabetical', () => {
      expect(component.projectFilterOptions()).toEqual([
        { value: '9', label: 'PRJ-Nine' },
        { value: '7', label: 'PRJ-Seven' },
      ]);
    });

    it('falls back to the raw project id while the project names are still loading', () => {
      bilateralAiService.projectNameMap.set({});
      fixture.detectChanges();
      expect(component.projectFilterOptions().map(option => option.label)).toEqual(['7', '9']);
    });

    it('never offers a project that has no drafts in this list', () => {
      // 42 exists in CLARISA but produced no drafts — offering it would empty the page.
      bilateralAiService.projectNameMap.set({ 7: 'PRJ-Seven', 9: 'PRJ-Nine', 42: 'PRJ-FortyTwo' });
      fixture.detectChanges();
      expect(component.projectFilterOptions().map(option => option.value)).not.toContain('42');
    });

    it('shows every draft while no project is selected', () => {
      expect(component.filter.selectedProjectId()).toBeNull();
      expect(component.filter.hasActiveFilters()).toBe(false);
      expect(component.drafts().map(draft => draft.id)).toEqual([1, 2, 3]);
      expect(renderedTitles()).toEqual(['Alpha draft', 'Beta draft', 'Gamma draft']);
    });

    it('keeps only the drafts of the selected project', () => {
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.drafts().map(draft => draft.id)).toEqual([1, 2]);
      expect(renderedTitles()).toEqual(['Alpha draft', 'Beta draft']);
      expect(component.hasDrafts()).toBe(true);
      expect(component.isFilteredEmpty()).toBe(false);
    });

    it('matches ids the payload serialises as strings', () => {
      bilateralAiService.draftList.set([
        { ...alpha, job: { ...(alpha as any).job, project_id: '7' } } as unknown as BilateralAiDraft,
        gamma,
      ]);
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.drafts().map(draft => draft.id)).toEqual([1]);
    });

    it('counts the hidden drafts in the subtitle', () => {
      expect(component.subtitle()).toBe('3 drafts ready for review');
      component.onProjectFilterChange('7');
      fixture.detectChanges();
      expect(component.subtitle()).toBe('Showing 2 of 3 drafts');
    });

    it('shows a chip naming the active project', () => {
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.selectedProjectLabel()).toBe('PRJ-Seven');
      const chip = fixture.debugElement.query(By.css('.mdr-filter-chip'));
      expect(chip.nativeElement.textContent).toContain('PRJ-Seven');
    });

    it('brings every draft back when the filter is cleared', () => {
      component.onProjectFilterChange('7');
      fixture.detectChanges();
      expect(component.drafts().length).toBe(2);

      component.clearFilters();
      fixture.detectChanges();

      expect(component.filter.selectedProjectId()).toBeNull();
      expect(component.filter.hasActiveFilters()).toBe(false);
      expect(component.drafts().map(draft => draft.id)).toEqual([1, 2, 3]);
      expect(renderedTitles()).toEqual(['Alpha draft', 'Beta draft', 'Gamma draft']);
      expect(fixture.debugElement.query(By.css('.mdr-filter-chip'))).toBeNull();
    });

    it('clears the filter through the chip button', () => {
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      fixture.debugElement.query(By.css('.mdr-filter-chip button')).nativeElement.click();
      fixture.detectChanges();

      expect(component.filter.selectedProjectId()).toBeNull();
      expect(renderedTitles().length).toBe(3);
    });

    it('treats the shared select sentinel and a re-pick of the active project as "no filter"', () => {
      component.onProjectFilterChange('all');
      expect(component.filter.selectedProjectId()).toBeNull();

      component.onProjectFilterChange('7');
      component.onProjectFilterChange('7');
      expect(component.filter.selectedProjectId()).toBeNull();
    });

    it('maps a null selection back to the shared select sentinel', () => {
      expect(component.selectValue(component.filter.selectedProjectId())).toBe('all');
      component.onProjectFilterChange('9');
      expect(component.selectValue(component.filter.selectedProjectId())).toBe('9');
    });

    it('offers a way out when the filter hides everything', () => {
      bilateralAiService.draftList.set([gamma]);
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.hasAnyDrafts()).toBe(true);
      expect(component.hasDrafts()).toBe(false);
      expect(component.isFilteredEmpty()).toBe(true);

      const empty = fixture.debugElement.query(By.css('.mdr-empty--filtered'));
      expect(empty).not.toBeNull();
      // The "no drafts yet" CTA must NOT be the one on screen: it sends the user off to create a result.
      expect(empty.nativeElement.textContent).toContain('Clear filter');

      empty.query(By.css('.mdr-empty-cta')).nativeElement.click();
      fixture.detectChanges();
      expect(component.isFilteredEmpty()).toBe(false);
      expect(component.drafts().map(draft => draft.id)).toEqual([3]);
    });

    it('keeps the "no drafts yet" empty state when the centre really has none', () => {
      bilateralAiService.draftList.set([]);
      fixture.detectChanges();

      expect(component.isFilteredEmpty()).toBe(false);
      expect(fixture.debugElement.query(By.css('.mdr-empty--filtered'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.mdr-empty'))).not.toBeNull();
      expect(component.subtitle()).toBe('No drafts yet');
      // No toolbar to filter an empty list with.
      expect(fixture.debugElement.query(By.css('.mdr-filter'))).toBeNull();
    });

    it('ignores drafts whose payload carries no job when a project is selected', () => {
      const orphan = { ...alpha, id: 4, job: undefined } as unknown as BilateralAiDraft;
      bilateralAiService.draftList.set([alpha, orphan]);
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.drafts().map(draft => draft.id)).toEqual([1]);
    });
  });
});
