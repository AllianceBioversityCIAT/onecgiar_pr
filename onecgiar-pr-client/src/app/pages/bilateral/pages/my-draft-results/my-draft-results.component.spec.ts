import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { convertToParamMap, RouterModule } from '@angular/router';
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

  describe('relative date calculation (BADR-R-11, BADR-AC-8, Defect Gate D3)', () => {
    it('should format today correctly', () => {
      expect(component.formatDate(new Date().toISOString())).toBe('Today');
    });

    it('returns "Today" for negative time diffs and future timestamps (Defect Gate D3)', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      expect(component.formatDate(futureDate)).toBe('Today');
    });

    it('returns "Yesterday" for 1 day ago', () => {
      const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
      expect(component.formatDate(yesterday)).toBe('Yesterday');
    });

    it('returns "N days ago" for 2 to 6 days', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      expect(component.formatDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('returns formatted date string for 7 or more days', () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
      const result = component.formatDate(tenDaysAgo);
      expect(result).not.toContain('days ago');
      expect(result).not.toBe('Today');
    });
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

    it('tells the user Create Result turns the draft into a real result', () => {
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

  describe('P2-3315 — Center validation before creating an AI draft result', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    it('explains that AI drafts require Center validation before creating a result (BADR-R-6, D2)', () => {
      component.onPromoteClick(draftStub);
      fixture.detectChanges();

      const validationEl = fixture.debugElement.query(By.css('[data-testid="draft-center-validation"]'));
      expect(validationEl).toBeTruthy();
      expect(validationEl.nativeElement.textContent).toContain('I confirm that my Center has reviewed and validated this AI-generated draft');
    });

    it('keeps creation disabled until the Center validation is confirmed', () => {
      component.onPromoteClick(draftStub);
      fixture.detectChanges();

      const confirmButton = fixture.debugElement.query(By.css('[data-testid="draft-promotion-confirm"]')).nativeElement as HTMLButtonElement;
      expect(component.centerValidationConfirmed()).toBe(false);
      expect(confirmButton.disabled).toBe(true);

      component.centerValidationConfirmed.set(true);
      fixture.detectChanges();
      expect(confirmButton.disabled).toBe(false);
    });

    it('does not promote without validation and resets it after confirmation', () => {
      const promoteSpy = jest.spyOn(bilateralAiService, 'promoteDraft').mockImplementation();
      component.onPromoteClick(draftStub);
      component.onPromoteConfirm();
      expect(promoteSpy).not.toHaveBeenCalled();

      component.onPromoteClick(draftStub);
      component.centerValidationConfirmed.set(true);
      component.onPromoteConfirm();

      expect(promoteSpy).toHaveBeenCalledWith(draftStub.id);
      expect(component.centerValidationConfirmed()).toBe(false);
      expect(component.promoteTarget()).toBeNull();
    });

    it('resets Center validation when promotion is cancelled or a different draft is selected', () => {
      component.onPromoteClick(draftStub);
      component.centerValidationConfirmed.set(true);
      component.onPromoteCancel();
      expect(component.centerValidationConfirmed()).toBe(false);

      component.centerValidationConfirmed.set(true);
      component.onPromoteClick({ ...draftStub, id: 2 } as BilateralAiDraft);
      expect(component.centerValidationConfirmed()).toBe(false);
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

  describe('BADR-T-2: Card Badges, Metadata Strip & Action Hierarchy (BADR-R-8..13, BADR-AC-6..9, D4)', () => {
    beforeEach(() => {
      bilateralAiService.projectNameMap.set({
        7: 'A-AG10156 — Climate Rice Advisory',
      });
      bilateralAiService.initiativeNameMap.set({
        SP01: 'Climate Resilience Program',
      });
      const draftWithWarnings = {
        ...draftStub,
        mapping_warnings: ['Indicator category uncertain', 'Missing lead center'],
      } as BilateralAiDraft;
      bilateralAiService.draftList.set([draftWithWarnings]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    it('groups Category pill, Level pill, and Draft status pill inside table row (BADR-R-9, BADR-AC-6)', () => {
      const row = fixture.debugElement.query(By.css('.mdr-card-row'));
      expect(row).toBeTruthy();

      const typePill = row.query(By.css('.mdr-card-type'));
      const levelPill = row.query(By.css('.mdr-card-level'));
      const statusPill = row.query(By.css('.mdr-status'));

      expect(typePill?.nativeElement.textContent.trim()).toBe('Capacity Sharing');
      expect(levelPill?.nativeElement.textContent.trim()).toBe('Output');
      expect(statusPill?.nativeElement.textContent.trim()).toBe('Draft');
    });

    it('renders horizontal metadata in session header with project, program and session (BADR-R-10, BADR-AC-7)', () => {
      const header = fixture.debugElement.query(By.css('.mdr-session-header'));
      expect(header).toBeTruthy();

      // Project item
      const projectItem = header.query(By.css('.mdr-meta-item--project'));
      expect(projectItem).toBeTruthy();
      expect(projectItem.nativeElement.textContent).toContain('A-AG10156');
      expect(projectItem.nativeElement.textContent).toContain('Climate Rice Advisory');
      const projectTooltip = projectItem.injector.get(PrTooltipDirective);
      expect(projectTooltip.text).toBe('A-AG10156 — Climate Rice Advisory');

      // Program item
      const programItem = header.query(By.css('.mdr-meta-item--program'));
      expect(programItem).toBeTruthy();
      expect(programItem.nativeElement.textContent).toContain('SP01');
      const programTooltip = programItem.injector.get(PrTooltipDirective);
      expect(programTooltip.text).toBe('SP01 — Climate Resilience Program');

      // AI session item
      const sessionItem = header.query(By.css('.mdr-meta-session'));
      expect(sessionItem).toBeTruthy();
      expect(sessionItem.nativeElement.textContent).toContain('#3ce3462d');
    });

    it('renders mapping warning tags when present (BADR-R-13)', () => {
      const warnings = fixture.debugElement.queryAll(By.css('.mdr-warning-tag'));
      expect(warnings.length).toBe(2);
      expect(warnings[0].nativeElement.textContent).toContain('Indicator category uncertain');
      expect(warnings[1].nativeElement.textContent).toContain('Missing lead center');
    });

    it('renders action buttons with primary Create Result, secondary Review, and danger Delete (BADR-R-12, BADR-AC-9, D4)', () => {
      const actions = fixture.debugElement.query(By.css('.mdr-actions'));
      expect(actions).toBeTruthy();

      const reviewBtn = actions.query(By.css('.mdr-btn--review'));
      expect(reviewBtn).toBeTruthy();
      expect(reviewBtn.nativeElement.textContent).toContain('Review');
      expect(reviewBtn.query(By.css('i'))?.nativeElement.textContent.trim()).toBe('visibility');

      const promoteBtn = actions.query(By.css('.mdr-btn--promote'));
      expect(promoteBtn).toBeTruthy();
      expect(promoteBtn.nativeElement.textContent).toContain('Create Result');
      expect(promoteBtn.query(By.css('i'))?.nativeElement.textContent.trim()).toBe('arrow_upward');

      const discardBtn = actions.query(By.css('.mdr-btn--discard'));
      expect(discardBtn).toBeTruthy();
      expect(discardBtn.nativeElement.getAttribute('aria-label')).toBe('Delete draft');
      expect(discardBtn.query(By.css('i'))?.nativeElement.textContent.trim()).toBe('delete_outline');
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

    it('shows a chip naming the active project and the count subtitle (BADR-R-4, BADR-AC-3)', () => {
      component.onProjectFilterChange('7');
      fixture.detectChanges();

      expect(component.selectedProjectLabel()).toBe('PRJ-Seven');
      const chip = fixture.debugElement.query(By.css('.mdr-filter-chip'));
      expect(chip.nativeElement.textContent).toContain('PRJ-Seven');

      const count = fixture.debugElement.query(By.css('[data-testid="mdr-filter-count"]'));
      expect(count.nativeElement.textContent.trim()).toBe('Showing 2 of 3 drafts');
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

    it('toggles project dropdown and resets search query on close', () => {
      expect(component.isProjectDropdownOpen()).toBe(false);
      component.toggleProjectDropdown();
      expect(component.isProjectDropdownOpen()).toBe(true);

      component.projectSearchQuery.set('rice');
      component.closeProjectDropdown();
      expect(component.isProjectDropdownOpen()).toBe(false);
      expect(component.projectSearchQuery()).toBe('');
    });

    it('filters project options by search query (BADR-R-3)', () => {
      component.projectSearchQuery.set('Seven');
      expect(component.filteredProjectOptions().map(o => o.value)).toEqual(['7']);

      component.projectSearchQuery.set('nine');
      expect(component.filteredProjectOptions().map(o => o.value)).toEqual(['9']);

      component.projectSearchQuery.set('nonexistent');
      expect(component.filteredProjectOptions().length).toBe(0);

      component.projectSearchQuery.set('');
      expect(component.filteredProjectOptions().length).toBe(2);
    });

    it('selects project and closes dropdown via selectProjectAndClose (BADR-R-2)', () => {
      component.toggleProjectDropdown();
      expect(component.isProjectDropdownOpen()).toBe(true);

      component.selectProjectAndClose('7');
      expect(component.filter.selectedProjectId()).toBe('7');
      expect(component.isProjectDropdownOpen()).toBe(false);
    });

    it('formats project option with code and title when shortName and fullName are present (BADR-R-1, BADR-AC-1)', () => {
      bilateralAiService.projectNameMap.set({
        7: 'A-AG10156 — Climate Rice Advisory',
      });
      fixture.detectChanges();

      const opt = component.projectFilterOptions().find(o => o.value === '7');
      expect(opt).toEqual({
        value: '7',
        label: 'A-AG10156 — Climate Rice Advisory',
        code: 'A-AG10156',
        title: 'Climate Rice Advisory',
      });
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

  describe('BSA-T-3: Viewport-Locked Scroller & Docked Toolbar', () => {
    it('should have pr-viewport-page host class', () => {
      expect((fixture.nativeElement as HTMLElement).classList.contains('pr-viewport-page')).toBe(true);
    });

    it('should render #workArea scroller with responsive viewport lock classes (BSA-R-4, BSA-AC-5)', () => {
      const workArea = fixture.nativeElement.querySelector('#workArea') as HTMLElement;
      expect(workArea).toBeTruthy();
      expect(workArea.className).toContain('min-[900px]:overflow-y-auto');
      expect(workArea.className).toContain('min-[900px]:flex-1');
      expect(workArea.className).toContain('min-[900px]:min-h-0');
      expect(workArea.className).toContain('custom_scroll');
    });

    it('should dock project filter toolbar above #workArea scroller when drafts exist (BSA-R-5, BSA-AC-6)', () => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();

      const hostEl = fixture.nativeElement as HTMLElement;
      const toolbar = hostEl.querySelector('.mdr-toolbar-docked') as HTMLElement;
      const workArea = hostEl.querySelector('#workArea') as HTMLElement;

      expect(toolbar).toBeTruthy();
      expect(toolbar.classList.contains('flex-none')).toBe(true);
      expect(workArea).toBeTruthy();

      // Verify toolbar is docked above #workArea in DOM order
      expect(toolbar.compareDocumentPosition(workArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(workArea.contains(toolbar)).toBe(false);
      expect(toolbar.nextElementSibling).toBe(workArea);
    });

    it('should render modern skeleton loading state using .pr-skeleton when loading (BSA-R-8, BSA-AC-9)', () => {
      bilateralAiService.isDraftListLoaded.set(false);
      fixture.detectChanges();

      const skeletonHost = fixture.nativeElement.querySelector('[data-testid="mdr-loading-skeleton"]');
      expect(skeletonHost).toBeTruthy();

      const skeletons = fixture.nativeElement.querySelectorAll('.pr-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('BADR-T-3: Responsive Fluid Breakpoints & Overflow Prevention (BADR-R-14..16, BADR-AC-10, D5)', () => {
    beforeEach(() => {
      bilateralAiService.draftList.set([draftStub]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();
    });

    it('renders fluid card layout without fixed width overflow constraints (BADR-R-14..16, D5)', () => {
      const card = fixture.nativeElement.querySelector('.mdr-session-card') as HTMLElement;
      expect(card).toBeTruthy();

      const tableContainer = card.querySelector('.mdr-table-container') as HTMLElement;
      expect(tableContainer).toBeTruthy();
      expect(tableContainer.classList.contains('overflow-x-auto')).toBe(true);

      const table = card.querySelector('.mdr-session-table') as HTMLElement;
      expect(table).toBeTruthy();
    });

    it('ensures project filter has fluid small-screen constraints (BADR-R-16, BADR-AC-10)', () => {
      const filter = fixture.nativeElement.querySelector('.mdr-filter') as HTMLElement;
      expect(filter).toBeTruthy();
      expect(filter.classList.contains('w-full')).toBe(true);
      expect(filter.classList.contains('max-w-[320px]')).toBe(true);
    });

    it('ensures dropdown template specifies mobile-friendly max-width to prevent overflow (Defect Gate D5)', () => {
      component.toggleProjectDropdown();
      fixture.detectChanges();

      const dropdown = document.querySelector('.mdr-project-dropdown') as HTMLElement;
      expect(dropdown).toBeTruthy();
      expect(dropdown.className).toContain('max-w-[calc(100vw-32px)]');
      component.closeProjectDropdown();
    });
  });

  describe('session grouping by AI Assistant session', () => {
    it('groups drafts by job_id into a single session group with shared metadata', () => {
      const draftA = { ...draftStub, id: 101, extracted_mds: { title: 'Draft A' } } as BilateralAiDraft;
      const draftB = { ...draftStub, id: 102, extracted_mds: { title: 'Draft B' } } as BilateralAiDraft;
      bilateralAiService.draftList.set([draftA, draftB]);
      fixture.detectChanges();

      const groups = component.sessionGroups();
      expect(groups.length).toBe(1);
      expect(groups[0].drafts.length).toBe(2);
      expect(groups[0].sessionShortHash).toBe('#3ce3462d');

      const sessionCards = fixture.debugElement.queryAll(By.css('.mdr-session-card'));
      expect(sessionCards.length).toBe(1);

      const rows = sessionCards[0].queryAll(By.css('.mdr-card-row'));
      expect(rows.length).toBe(2);
    });

    it('creates multiple session groups for drafts with different job_ids', () => {
      const draftA = { ...draftStub, id: 101, job_id: '11111111-e229-49e7-ad53-302f3d0c36a0', job: { job_id: '11111111-e229-49e7-ad53-302f3d0c36a0' } } as any;
      const draftB = { ...draftStub, id: 102, job_id: '22222222-e229-49e7-ad53-302f3d0c36a0', job: { job_id: '22222222-e229-49e7-ad53-302f3d0c36a0' } } as any;
      bilateralAiService.draftList.set([draftA, draftB]);
      fixture.detectChanges();

      const groups = component.sessionGroups();
      expect(groups.length).toBe(2);
      expect(groups[0].sessionShortHash).toBe('#11111111');
      expect(groups[1].sessionShortHash).toBe('#22222222');

      const sessionCards = fixture.debugElement.queryAll(By.css('.mdr-session-card'));
      expect(sessionCards.length).toBe(2);
    });
  });

  // @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15) — asserts the rendered chip and
  // count, not `filter.selectedProjectId()` directly (this folder's own convention: rendered
  // output over internal field, so the assertion also proves the template branch exists).
  describe('COV-T-7: reads `project` from the shared query-param contract on init (COV-R-15)', () => {
    const draftOtherProject = {
      ...draftStub,
      id: 2,
      job: { ...draftStub.job, project_id: 55 },
    } as unknown as BilateralAiDraft;

    it('pre-selects the project filter from `?project=`, reflected in the rendered chip and the "Showing N of M" count', () => {
      bilateralAiService.draftList.set([draftStub, draftOtherProject]);
      bilateralAiService.isDraftListLoaded.set(true);

      // `ngOnInit` already ran once in the outer `beforeEach` against the default (query-param-less)
      // `ActivatedRoute` from `RouterModule.forRoot([])`; re-point it at a `?project=` URL and
      // re-run init, the same way the rest of this file re-applies state after the initial render.
      (component as any).activatedRoute = { snapshot: { queryParamMap: convertToParamMap({ project: '7' }) } };
      component.ngOnInit();
      fixture.detectChanges();

      const chip = fixture.nativeElement.querySelector('.mdr-filter-chip');
      expect(chip?.textContent).toContain('Project:');

      const count = fixture.nativeElement.querySelector('[data-testid="mdr-filter-count"]');
      expect(count?.textContent.trim()).toBe('Showing 1 of 2 drafts');
    });

    it('does not filter when `project` is absent from the URL', () => {
      bilateralAiService.draftList.set([draftStub, draftOtherProject]);
      bilateralAiService.isDraftListLoaded.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.mdr-filter-chip')).toBeNull();
      const count = fixture.nativeElement.querySelector('[data-testid="mdr-filter-count"]');
      expect(count).toBeNull();
    });
  });
});
