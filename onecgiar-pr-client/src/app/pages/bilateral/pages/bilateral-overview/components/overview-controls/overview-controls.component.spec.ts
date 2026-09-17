// @akili-spec bilateral/center-overview-tab (COV-T-5, COV-R-2, COV-R-3, COV-R-18)
//
// The controls component is presentational, so every case drives it the way the page does — inputs
// in, rendered DOM and emitted outputs out — and never reaches for a private field.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { OverviewControlsComponent } from './overview-controls.component';
import { Phases } from '../../../../../../shared/interfaces/phasesList.interface';
import { BilateralQueryParams } from '../../../../bilateral-query-params';

/**
 * `COV-R-2` C, HITL H-2 — `GET /api/versioning` delivers `Phases.id` as a **string** (`'34'`, `'36'`
 * in the live AfricaRice payload) although `Phases` types it `number`, while `selectedPhaseId` is
 * numeric. Every fixture below keeps the API's real shape so the component has to normalize.
 */
function phase(overrides: Partial<Phases>): Phases {
  const merged = {
    is_active: true,
    created_date: '2026-01-01',
    last_updated_date: '2026-01-01',
    created_by: null,
    last_updated_by: null,
    id: 36,
    phase_name: 'Reporting 2026',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    toc_pahse_id: '1',
    cgspace_year: 2026,
    phase_year: 2026,
    status: true,
    previous_phase: 0,
    app_module_id: 1,
    obj_previous_phase: null as unknown as Phases,
    can_be_deleted: false,
    selected: true,
    obj_portfolio: { id: 1, acronym: 'P25' },
    ...overrides,
  };
  return { ...merged, id: String(merged.id) as unknown as number };
}

const OPEN_PHASE_ID = 36;
const CLOSED_PHASE_ID = 35;
const OPEN_PHASE = phase({});
const CLOSED_PHASE = phase({ id: CLOSED_PHASE_ID, phase_name: 'Reporting 2025', phase_year: 2025, status: false });

function params(overrides: Partial<BilateralQueryParams> = {}): BilateralQueryParams {
  return {
    phase: OPEN_PHASE_ID,
    status: [],
    project: [],
    program: [],
    type: [],
    role: null,
    source: null,
    method: null,
    search: '',
    createdBy: [],
    multi: false,
    ...overrides,
  };
}

describe('OverviewControlsComponent (COV-T-5)', () => {
  let fixture: ComponentFixture<OverviewControlsComponent>;
  let component: OverviewControlsComponent;

  function el(testId: string) {
    return fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
  }

  /** The popover renders into a CDK overlay, i.e. outside the fixture's own DOM. */
  function overlay(selector: string): HTMLElement | null {
    return document.querySelector(selector);
  }

  /**
   * The CDK's `InteractivityChecker` refuses any element with no geometry — which in jsdom is EVERY
   * element, since it has no layout engine. Giving `getClientRects` a box is what lets the REAL
   * focus trap run here instead of silently finding nothing focusable. Must be installed before the
   * popover opens: the trap subscribes to `onStable`, which fires as soon as the click handler ends.
   */
  function enableLayout(): void {
    jest
      .spyOn(HTMLElement.prototype, 'getClientRects')
      .mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList);
  }

  /** `cdkTrapFocusAutoCapture` focuses the first tabbable element on a macrotask, not synchronously. */
  async function settleFocus(): Promise<void> {
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewControlsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(OverviewControlsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('phases', [OPEN_PHASE, CLOSED_PHASE]);
    fixture.componentRef.setInput('selectedPhaseId', OPEN_PHASE_ID);
    fixture.componentRef.setInput('params', params());
    fixture.componentRef.setInput('programOptions', [
      { value: 'SP01', label: 'Better Diets' },
      { value: 'SP02', label: 'Resilient Agrifood Systems' },
    ]);
    fixture.componentRef.setInput('projectOptions', [{ value: 100, label: 'Alpha — Alpha project' }]);
    fixture.componentRef.setInput('typeOptions', [{ value: 6, label: 'Knowledge product' }]);
    fixture.detectChanges();
  });

  afterEach(() => {
    component.closePopover();
    component.closePhaseListbox(false);
    fixture.destroy();
    jest.restoreAllMocks();
  });

  describe('phase combobox + listbox (COV-R-2, COV-R-3 C)', () => {
    function openListbox(): HTMLElement {
      (el('overview-phase-trigger').nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();
      return overlay('[data-testid="overview-phase-listbox"]')!;
    }

    it('labels every option «phase_name» · «phase_year», sorted phase_year desc, badging the Open one', () => {
      fixture.componentRef.setInput('phases', [CLOSED_PHASE, OPEN_PHASE]); // API order is not guaranteed
      fixture.detectChanges();

      expect(component.phaseOptions()).toEqual([
        { id: OPEN_PHASE_ID, label: 'Reporting 2026 · 2026', isOpen: true },
        { id: CLOSED_PHASE_ID, label: 'Reporting 2025 · 2025', isOpen: false },
      ]);
    });

    it('shows the selected phase on a collapsed combobox trigger', () => {
      const trigger = el('overview-phase-trigger').nativeElement as HTMLButtonElement;

      expect(trigger.getAttribute('role')).toBe('combobox');
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.getAttribute('aria-controls')).toBe(component.phaseListboxId);
      expect(trigger.textContent!.replace(/\s+/g, ' ')).toContain('Reporting 2026 · 2026');
      expect(overlay('[data-testid="overview-phase-listbox"]')).toBeFalsy();
    });

    it('opens a listbox with one option per phase and marks the selected one', () => {
      const listbox = openListbox();

      expect(el('overview-phase-trigger').nativeElement.getAttribute('aria-expanded')).toBe('true');
      expect(listbox.getAttribute('role')).toBe('listbox');

      const options = listbox.querySelectorAll('button[role="option"]');
      expect(options.length).toBe(2);
      expect(options[0].getAttribute('data-testid')).toBe(`overview-phase-option-${OPEN_PHASE_ID}`);
      expect(options[0].getAttribute('aria-selected')).toBe('true');
      expect(options[1].getAttribute('data-testid')).toBe(`overview-phase-option-${CLOSED_PHASE_ID}`);
      expect(options[1].getAttribute('aria-selected')).toBe('false');
      // The Open pill repeats inside its own row, next to the label.
      expect(options[0].querySelector('[data-testid="overview-phase-option-open-badge"]')).toBeTruthy();
      expect(options[1].querySelector('[data-testid="overview-phase-option-open-badge"]')).toBeFalsy();
    });

    it('renders the Open badge next to the trigger only while the selected phase is open', () => {
      expect(el('overview-phase-open-badge')).toBeTruthy();

      fixture.componentRef.setInput('selectedPhaseId', CLOSED_PHASE_ID);
      fixture.detectChanges();
      expect(el('overview-phase-open-badge')).toBeFalsy();
    });

    it('clicking an option emits the numeric id and closes the listbox', () => {
      const emitted: number[] = [];
      component.phaseChange.subscribe(value => emitted.push(value));

      const listbox = openListbox();
      (listbox.querySelector(`[data-testid="overview-phase-option-${CLOSED_PHASE_ID}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted).toEqual([CLOSED_PHASE_ID]);
      expect(typeof emitted[0]).toBe('number');
      expect(component.phaseOpen()).toBe(false);
      expect(overlay('[data-testid="overview-phase-listbox"]')).toBeFalsy();
    });

    it('ArrowDown on the trigger opens it, then ArrowDown + Enter select the next phase', () => {
      const emitted: number[] = [];
      component.phaseChange.subscribe(value => emitted.push(value));

      component.onPhaseTriggerKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      fixture.detectChanges();
      expect(component.phaseOpen()).toBe(true);
      // Opening starts on the SELECTED option, not on the first one by accident.
      expect(component.activePhaseId()).toBe(OPEN_PHASE_ID);

      component.onPhaseListKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.activePhaseId()).toBe(CLOSED_PHASE_ID);
      component.onPhaseListKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();

      expect(emitted).toEqual([CLOSED_PHASE_ID]);
      expect(component.phaseOpen()).toBe(false);
    });

    it('Home and End jump to the first and last option', () => {
      openListbox();

      component.onPhaseListKeydown(new KeyboardEvent('keydown', { key: 'End' }));
      expect(component.activePhaseId()).toBe(CLOSED_PHASE_ID);
      component.onPhaseListKeydown(new KeyboardEvent('keydown', { key: 'Home' }));
      expect(component.activePhaseId()).toBe(OPEN_PHASE_ID);
    });

    it('Escape closes without emitting and returns focus to the trigger', async () => {
      const emitted = jest.fn();
      component.phaseChange.subscribe(emitted);

      const trigger = el('overview-phase-trigger').nativeElement as HTMLButtonElement;
      trigger.focus();
      trigger.click();
      fixture.detectChanges();

      component.onPhaseListKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      await settleFocus();

      expect(component.phaseOpen()).toBe(false);
      expect(emitted).not.toHaveBeenCalled();
      expect(overlay('[data-testid="overview-phase-listbox"]')).toBeFalsy();
      expect(document.activeElement).toBe(trigger);
    });

    it('a backdrop click closes it without emitting', () => {
      const emitted = jest.fn();
      component.phaseChange.subscribe(emitted);

      openListbox();
      (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      fixture.detectChanges();

      expect(component.phaseOpen()).toBe(false);
      expect(emitted).not.toHaveBeenCalled();
    });

    it('emits the picked phase once, and not when it is already selected', () => {
      const emitted: number[] = [];
      component.phaseChange.subscribe(value => emitted.push(value));

      component.onPhasePicked(OPEN_PHASE_ID);
      component.onPhasePicked(CLOSED_PHASE_ID);
      component.onPhasePicked(null);

      expect(emitted).toEqual([CLOSED_PHASE_ID]);
    });

    /** HITL H-2 — the selection has to resolve against the string ids the API actually sends. */
    it('resolves the selection from the API string ids and exposes numeric option values', () => {
      expect(component.selectedPhase()?.phase_name).toBe('Reporting 2026');
      expect(component.phaseOptions().map(option => option.id)).toEqual([OPEN_PHASE_ID, CLOSED_PHASE_ID]);
    });

    it('emits a NUMBER even when the raw string id comes back', () => {
      const emitted: number[] = [];
      component.phaseChange.subscribe(value => emitted.push(value));

      component.onPhasePicked('35');

      expect(emitted).toEqual([CLOSED_PHASE_ID]);
      expect(typeof emitted[0]).toBe('number');
    });
  });

  describe('filter badge and chips (COV-R-3 A)', () => {
    it('counts one badge unit and renders one chip per ACTIVE dimension', () => {
      fixture.componentRef.setInput('params', params({ program: ['SP01', 'SP02'], source: 'w3' }));
      fixture.detectChanges();

      expect(el('overview-filter-badge').nativeElement.textContent.trim()).toBe('2');
      const chipText = (el('overview-filter-chips').nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
      expect(chipText).toContain('Program: Better Diets, Resilient Agrifood Systems');
      expect(chipText).toContain('Source: W3/Bilateral');
    });

    it('hides the badge, the chip row and Clear when nothing is filtered', () => {
      expect(el('overview-filter-badge')).toBeFalsy();
      expect(el('overview-filter-chips')).toBeFalsy();
      expect(el('overview-clear-filters')).toBeFalsy();
    });

    it('removing a chip emits that dimension cleared and leaves the others alone', () => {
      fixture.componentRef.setInput('params', params({ program: ['SP01'], source: 'w3' }));
      fixture.detectChanges();

      let emitted: BilateralQueryParams | null = null;
      component.filtersChange.subscribe(value => (emitted = value));

      const removeButtons = fixture.debugElement.queryAll(By.css('[data-testid="overview-filter-chips"] button'));
      (removeButtons[0].nativeElement as HTMLButtonElement).click();

      expect(emitted!).toEqual(expect.objectContaining({ program: [], source: 'w3', phase: OPEN_PHASE_ID }));
    });

    it('Clear emits clearFilters and closes the popover', () => {
      fixture.componentRef.setInput('params', params({ program: ['SP01'] }));
      fixture.detectChanges();
      component.togglePopover();
      fixture.detectChanges();

      const cleared = jest.fn();
      component.clearFilters.subscribe(cleared);
      (el('overview-clear-filters').nativeElement as HTMLButtonElement).click();

      expect(cleared).toHaveBeenCalledTimes(1);
      expect(component.popoverOpen()).toBe(false);
    });
  });

  describe('popover (COV-R-3 C)', () => {
    it('opens with the six dimensions and applies the draft only on Apply', () => {
      const emitted: BilateralQueryParams[] = [];
      component.filtersChange.subscribe(value => emitted.push(value));

      (el('overview-filter-button').nativeElement as HTMLButtonElement).click();
      fixture.detectChanges();

      const popover = overlay('[data-testid="overview-filter-popover"]');
      expect(popover).toBeTruthy();
      for (const label of ['Science Program', 'Project', 'Result type', 'Role', 'Source', 'Creation method']) {
        expect(popover!.textContent).toContain(label);
      }

      component.toggleProgram('SP01');
      component.selectSource('w3');
      fixture.detectChanges();
      expect(emitted).toEqual([]); // still a draft

      (overlay('[data-testid="overview-filter-apply"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(emitted.length).toBe(1);
      expect(emitted[0]).toEqual(expect.objectContaining({ program: ['SP01'], source: 'w3' }));
      expect(component.popoverOpen()).toBe(false);
    });

    it('Escape closes it without applying half-edited changes', () => {
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      component.togglePopover();
      fixture.detectChanges();
      component.toggleProgram('SP02');

      component.onOverlayKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(component.popoverOpen()).toBe(false);
      expect(emitted).not.toHaveBeenCalled();
      expect(overlay('[data-testid="overview-filter-popover"]')).toBeFalsy();

      // Re-opening starts from the APPLIED params, not from the discarded draft.
      component.togglePopover();
      fixture.detectChanges();
      expect(component.draftParams().program).toEqual([]);
    });

    it('Cancel and a backdrop click close it without applying', () => {
      const emitted = jest.fn();
      component.filtersChange.subscribe(emitted);

      component.togglePopover();
      fixture.detectChanges();
      component.toggleType(6);
      (overlay('[data-testid="overview-filter-cancel"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.popoverOpen()).toBe(false);
      expect(emitted).not.toHaveBeenCalled();

      component.togglePopover();
      fixture.detectChanges();
      component.toggleProject(100);
      (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      fixture.detectChanges();
      expect(component.popoverOpen()).toBe(false);
      expect(emitted).not.toHaveBeenCalled();
    });

    it('exposes every option as a keyboard-operable button with an aria-checked state', () => {
      component.togglePopover();
      fixture.detectChanges();

      const popover = overlay('[data-testid="overview-filter-popover"]')!;
      const checkboxes = popover.querySelectorAll('button[role="checkbox"]');
      const radios = popover.querySelectorAll('button[role="radio"]');
      expect(checkboxes.length).toBe(4); // 2 programs + 1 project + 1 type
      expect(radios.length).toBe(9); // three dimensions × (Both + two values)
      for (const node of [...Array.from(checkboxes), ...Array.from(radios)]) {
        expect(node.getAttribute('aria-checked')).toMatch(/true|false/);
      }
    });

    it('traps focus inside the popover and returns it to the Filter button on close', async () => {
      enableLayout();
      const trigger = el('overview-filter-button').nativeElement as HTMLButtonElement;
      trigger.focus();
      trigger.click();
      fixture.detectChanges();
      await settleFocus();

      // The CDK appends the overlay at the END of <body>; without the trap a keyboard user would
      // tab through the entire page before reaching a dialog anchored to the button they pressed.
      const popover = overlay('[data-testid="overview-filter-popover"]')!;
      expect(popover.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).not.toBe(trigger);

      component.onOverlayKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger);
    });

    it('returns focus to the Filter button after Apply too', async () => {
      enableLayout();
      const trigger = el('overview-filter-button').nativeElement as HTMLButtonElement;
      trigger.focus();
      trigger.click();
      fixture.detectChanges();
      await settleFocus();

      (overlay('[data-testid="overview-filter-apply"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger);
    });

    it('re-picking the active single-select value returns the dimension to "both"', () => {
      component.togglePopover();
      component.selectRole('lead');
      expect(component.draftParams().role).toBe('lead');
      component.selectRole('lead');
      expect(component.draftParams().role).toBeNull();
    });
  });
});
