import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralProjectSelectorComponent } from './bilateral-project-selector.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { signal } from '@angular/core';

describe('BilateralProjectSelectorComponent', () => {
  let component: BilateralProjectSelectorComponent;
  let fixture: ComponentFixture<BilateralProjectSelectorComponent>;
  let creationService: any;
  let ctxService: any;

  beforeEach(async () => {
    creationService = {
      projects: signal([]),
      selectedProject: signal(null),
      isLoadingProjects: signal(false),
      getProjects: jest.fn(),
      selectProject: jest.fn(),
      setLeadProject: jest.fn(),
      resultLeadCenterCode: signal<string | null>(null),
      isReplicated: signal(false),
      selectedPrimarySp: signal<any>(null),
    };

    ctxService = {
      centerId: signal('CENTER-01'),
      centerInstitutionId: signal(49),
      centerAcronym: signal('C01'),
      centerName: signal('Center One'),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralProjectSelectorComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralContextService, useValue: ctxService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralProjectSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('asks for the projects of the current centre on init', () => {
    expect(creationService.getProjects).toHaveBeenCalledWith(49);
  });

  // ⚠️ Regression lock. The endpoint keys off the numeric CLARISA institution id. Passing the
  // centre CODE returns 200 with `{ projects: [] }` — no error anywhere, the dropdown just renders
  // empty, and with the Reporting Project field being mandatory NO bilateral result can be created
  // at all. Verified on prtest: `centerId=CIP` → [], `centerId=49` → 1 project.
  it('never passes the centre code — that silently returns an empty list', () => {
    expect(creationService.getProjects).not.toHaveBeenCalledWith('CENTER-01');
    expect(typeof creationService.getProjects.mock.calls[0][0]).toBe('number');
  });

  it('does not ask for projects until the institution id is known', () => {
    creationService.getProjects.mockClear();
    ctxService.centerInstitutionId.set(null);
    fixture.detectChanges();
    expect(creationService.getProjects).not.toHaveBeenCalled();
  });

  it('wizard variant ignores the result lead Center code (create wizard unchanged)', () => {
    creationService.resultLeadCenterCode.set('CENTER-03');
    fixture.detectChanges();

    expect(creationService.getProjects).not.toHaveBeenCalledWith('CENTER-03');
    expect(creationService.getProjects).toHaveBeenLastCalledWith(49);
  });

  it('should emit on project select', () => {
    const emitSpy = jest.spyOn(component.projectSelected, 'emit');
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', summary: null, description: null, leadCenter: null, sciencePrograms: [] };
    creationService.projects.set([project]);
    component.selectProject(project);
    expect(creationService.selectProject).toHaveBeenCalledWith(project);
    expect(emitSpy).toHaveBeenCalledWith(project);
  });
  /**
   * P2-3518 — the same picker is embedded in the Section 0 card of an existing result, where the
   * card already renders the label and the summary/description block and where the Science Program
   * must NOT be cleared.
   */
  describe('inline variant (P2-3518)', () => {
    const project = { id: 77, shortName: 'NEWPROJ', fullName: 'New project', summary: 'S', description: 'D', leadCenter: null, sciencePrograms: [] };

    beforeEach(() => {
      fixture.componentRef.setInput('variant', 'inline');
      creationService.projects.set([project]);
      fixture.detectChanges();
    });

    it('drops the label and the summary/description block the host card already renders', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.bps-label')).toBeNull();
      expect(el.querySelector('.bps-project-info')).toBeNull();
      // The field itself is the whole point of the variant — it must still be there.
      expect(el.querySelector('.bps-field')).not.toBeNull();
    });

    // ⚠️ `selectProject()` clears `selectedPrimarySp` / `selectedSecondarySps`. On an existing
    // result that would blank the Science Program it already reports against, and what a project
    // change should do to the Science Program is an open requirement question.
    it('re-points the lead project instead of running the wizard selection', () => {
      const emitSpy = jest.spyOn(component.projectSelected, 'emit');

      component.selectProject(project as any);

      expect(creationService.setLeadProject).toHaveBeenCalledWith(project);
      expect(creationService.selectProject).not.toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(project);
    });

    // PAA-DD-6 / PAA-R-7 / AC-9 — the server validates a re-pointed project against the LEAD Center of
    // the result, which can differ from the page centre, so the inline catalogue must follow it.
    it('requests the catalogue of the result lead Center (code) once it is known', () => {
      creationService.getProjects.mockClear();
      creationService.resultLeadCenterCode.set('CENTER-03');
      fixture.detectChanges();

      const calls = creationService.getProjects.mock.calls;
      expect(calls[calls.length - 1][0]).toBe('CENTER-03');
    });

    it('falls back to the page institution id while the lead Center code is unknown', () => {
      creationService.getProjects.mockClear();
      ctxService.centerInstitutionId.set(50);
      fixture.detectChanges();

      expect(creationService.getProjects).toHaveBeenLastCalledWith(50);
      expect(creationService.getProjects).not.toHaveBeenCalledWith('CENTER-03');
    });

    it('keeps the label and the info block in the default wizard variant', () => {
      fixture.componentRef.setInput('variant', 'wizard');
      creationService.selectedProject.set(project);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.bps-label')).not.toBeNull();
      expect(el.querySelector('.bps-project-info')).not.toBeNull();
    });
  });

  /** PSC — Science Program chips in the inline picker of a replicated result. */
  describe('Science Program chips (PSC)', () => {
    const sp = (programId: number, programCode: string, spShortName = programCode, spName = `${programCode} full name`) => ({
      programId,
      programCode,
      allocation: '100',
      spName,
      spShortName,
    });
    const proj = (id: number, shortName: string, fullName: string, sciencePrograms: any[]) =>
      ({ id, shortName, fullName, summary: null, description: null, leadCenter: null, sciencePrograms, w1w2ContributorCount: 0 }) as any;

    const p1 = proj(1, 'A-ONE', 'Alpha potato', [sp(269, 'SP06', 'Climate')]);
    const p2 = proj(2, 'B-TWO', 'Beta rice', [sp(11, 'SP06', 'Climate'), sp(12, 'SP03', 'Breeding')]);
    const p3 = proj(3, 'C-THREE', 'Gamma maize', [sp(13, 'SP01', 'Policy')]);
    const p4 = proj(4, 'D-FOUR', 'Delta bean', [sp(52, 'SP02', 'Digital')]);
    const p5 = proj(5, 'E-FIVE', 'Epsilon', []);
    const all = [p1, p2, p3, p4, p5];

    const el = () => fixture.nativeElement as HTMLElement;
    const chips = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.bps-chips button.bps-chip'));
    const pressed = () => chips().filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent!.trim().split(/\s+/)[0]);
    const optionCodes = () => Array.from(el().querySelectorAll('.bps-option-code')).map(n => n.textContent!.trim());
    const filteredIds = () => component.filteredProjects().map(p => p.id);
    const primary = (programId: number, programCode: string) => ({ programId, programCode, allocation: '100' });
    const setup = (opts: { variant?: 'inline' | 'wizard'; replicated?: boolean; primary?: any; projects?: any[] } = {}) => {
      fixture.componentRef.setInput('variant', opts.variant ?? 'inline');
      creationService.isReplicated.set(opts.replicated ?? true);
      creationService.selectedPrimarySp.set(opts.primary ?? null);
      creationService.projects.set(opts.projects ?? all);
      component.showDropdown.set(true);
      fixture.detectChanges();
    };
    const textOnly = (text: string) =>
      all.filter(p => p.shortName.toLowerCase().includes(text) || p.fullName.toLowerCase().includes(text)).map(p => p.id);
    const chipBtn = (code: string) => chips().find(b => b.textContent!.includes(code))!;
    const click = (b: HTMLElement) => {
      b.click();
      fixture.detectChanges();
    };

    it('renders deduped, counted, code-sorted chips for a replicated inline result (S-1.1, S-1.3)', () => {
      setup();
      const labels = chips().map(b => b.textContent!.replace(/\s+/g, ' ').trim());
      expect(labels).toEqual(['SP01 · Policy 1', 'SP02 · Digital 1', 'SP03 · Breeding 1', 'SP06 · Climate 2']);
      expect(chipBtn('SP06').getAttribute('title')).toBe('SP06 full name');
    });

    it('no chip row when not replicated (S-1.2)', () => {
      setup({ replicated: false, primary: primary(1, 'SP06') });
      expect(el().querySelector('.bps-chips')).toBeNull();
      expect(filteredIds()).toEqual(all.map(p => p.id));
      component.searchText.set('potato');
      expect(filteredIds()).toEqual(textOnly('potato'));
    });

    it('no chip row in wizard variant, even with a stale selection (S-1.2)', () => {
      setup({ variant: 'wizard', replicated: true, primary: primary(1, 'SP06') });
      expect(el().querySelector('.bps-chips')).toBeNull();
      expect(filteredIds()).toEqual(all.map(p => p.id));
      component.searchText.set('rice');
      expect(filteredIds()).toEqual(textOnly('rice'));
    });

    it('no row when every project has empty sciencePrograms (S-1.3)', () => {
      setup({ projects: [p5], primary: primary(1, 'SP06') });
      expect(el().querySelector('.bps-chips')).toBeNull();
      expect(filteredIds()).toEqual([5]);
    });

    it('pre-selects the stored primary chip (S-2.1)', () => {
      setup({ primary: primary(52, 'SP06') });
      expect(pressed()).toEqual(['SP06']);
      expect(filteredIds()).toEqual([1, 2]);
      expect(optionCodes()).toEqual(['A-ONE', 'B-TWO']);
    });

    it('matches the default by code, never by id (S-2.2, P2-3807)', () => {
      // mapping id 52 belongs to SP02; it must NOT be selected
      setup({ primary: primary(52, 'sp06 ') });
      expect(pressed()).toEqual(['SP06']);
      expect(filteredIds()).toEqual([1, 2]);
    });

    it('nothing selected and full list when the primary is missing (S-2.3)', () => {
      setup({ primary: null });
      expect(pressed()).toEqual([]);
      expect(filteredIds()).toEqual(all.map(p => p.id));
    });

    it('nothing selected and full list when the primary code is not in the catalogue (S-2.3)', () => {
      setup({ primary: primary(99, 'SP12') });
      expect(pressed()).toEqual([]);
      expect(filteredIds()).toEqual(all.map(p => p.id));
    });

    it('keeps the reporter selection across close/reopen and re-seeds on a new saved primary (S-2.4)', () => {
      setup({ primary: primary(52, 'SP06') });
      click(chipBtn('SP01'));
      expect(pressed()).toEqual(['SP01', 'SP06']);

      component.toggleDropdown();
      component.toggleDropdown();
      fixture.detectChanges();
      expect(pressed()).toEqual(['SP01', 'SP06']);

      creationService.selectedPrimarySp.set(primary(12, 'SP03'));
      fixture.detectChanges();
      expect(pressed()).toEqual(['SP03']);
    });

    it('OR union lists each project once (S-3.1)', () => {
      setup();
      click(chipBtn('SP03'));
      click(chipBtn('SP06'));
      click(chipBtn('SP01'));
      // p2 maps to SP03 and SP06: still once
      expect(filteredIds()).toEqual([1, 2, 3]);
      expect(optionCodes()).toEqual(['A-ONE', 'B-TWO', 'C-THREE']);
    });

    it('chips AND search (S-3.2)', () => {
      setup({ primary: primary(1, 'SP06') });
      component.searchText.set('potato');
      expect(filteredIds()).toEqual([1]);
    });

    it('deselecting the last chip restores the full list (S-3.3)', () => {
      setup({ primary: primary(1, 'SP06') });
      click(chipBtn('SP06'));
      expect(pressed()).toEqual([]);
      expect(filteredIds()).toEqual(all.map(p => p.id));
    });

    it('clicking a chip keeps the dropdown open and commits nothing (S-3.4, R-5)', () => {
      setup();
      const emitSpy = jest.spyOn(component.projectSelected, 'emit');
      click(chipBtn('SP01'));
      expect(component.showDropdown()).toBe(true);
      expect(el().querySelector('.bps-dropdown')).not.toBeNull();
      expect(emitSpy).not.toHaveBeenCalled();
      expect(creationService.setLeadProject).not.toHaveBeenCalled();
      expect(creationService.selectProject).not.toHaveBeenCalled();
    });

    it('Clear button deselects all and does not close the dropdown (R-4)', () => {
      setup({ primary: primary(1, 'SP06') });
      const clear = el().querySelector<HTMLButtonElement>('.bps-chips .bps-chips-clear')!;
      expect(clear).not.toBeNull();
      click(clear);
      expect(pressed()).toEqual([]);
      expect(component.showDropdown()).toBe(true);
      expect(el().querySelector('.bps-chips .bps-chips-clear')).toBeNull();
    });

    it('empty state message and Clear filters clear the chips (S-4.1)', () => {
      setup({ primary: primary(52, 'SP02') });
      component.searchText.set('zzz-nothing');
      fixture.detectChanges();
      expect(el().textContent).toContain('No projects for the selected programs');
      const clearFilters = el().querySelector<HTMLButtonElement>('.bps-no-results button')!;
      expect(clearFilters.textContent).toContain('Clear filters');
      click(clearFilters);
      expect(pressed()).toEqual([]);
      expect(component.showDropdown()).toBe(true);
      expect(el().textContent).toContain('No projects found');
    });

    it('chips are native buttons with aria-pressed and a labelled group (R-5)', () => {
      setup({ primary: primary(52, 'SP06') });
      const group = el().querySelector('.bps-chips')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Filter by Science Program');
      expect(chips().length).toBe(4);
      chips().forEach(b => {
        expect(b.tagName).toBe('BUTTON');
        expect(b.getAttribute('type')).toBe('button');
        expect(['true', 'false']).toContain(b.getAttribute('aria-pressed'));
      });
      expect(chipBtn('SP06').getAttribute('aria-pressed')).toBe('true');
      expect(chipBtn('SP01').getAttribute('aria-pressed')).toBe('false');
    });
  });
});
