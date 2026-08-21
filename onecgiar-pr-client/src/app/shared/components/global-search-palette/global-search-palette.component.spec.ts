import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ApiService } from '../../services/api/api.service';
import { ResultFrameworkReportingHomeService } from '../../../pages/result-framework-reporting/pages/result-framework-reporting-home/services/result-framework-reporting-home.service';
import { GlobalSearchPaletteComponent, programDotColor } from './global-search-palette.component';
import { GlobalSearchPaletteService, PALETTE_DEBOUNCE_MS } from './global-search-palette.service';

const sp = (id: number, code: string, name: string) => ({ initiativeId: id, initiativeCode: code, initiativeName: name }) as any;

const row = (over: Record<string, unknown> = {}) => ({
  id: '10',
  result_code: '5844',
  title: 'Maize resilience in East Africa',
  submitter: 'SP01',
  status_id: '1',
  status_name: 'Editing',
  version_id: '12',
  ...over
});

describe('GlobalSearchPaletteComponent', () => {
  let fixture: ComponentFixture<GlobalSearchPaletteComponent>;
  let component: GlobalSearchPaletteComponent;
  let navigate: jest.Mock;
  let getAll: jest.Mock;

  const advance = () => {
    jest.advanceTimersByTime(PALETTE_DEBOUNCE_MS + 5);
    fixture.detectChanges();
  };
  const html = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    jest.useFakeTimers();
    navigate = jest.fn().mockResolvedValue(true);
    getAll = jest.fn().mockReturnValue(of({ response: { items: [row()] } }));

    await TestBed.configureTestingModule({
      imports: [GlobalSearchPaletteComponent],
      providers: [
        { provide: Router, useValue: { navigate } },
        // `HlmDialogContent` injects this; at runtime `BrnDialog` provides it. Under Jest the
        // dialog is stubbed, so the spec supplies it.
        { provide: BrnDialogRef, useValue: { state: () => 'open', close: jest.fn() } },
        {
          provide: ApiService,
          useValue: { authSE: { localStorageUser: { id: 7 } }, resultsSE: { GET_AllResultsWithUseRole: getAll } }
        },
        {
          provide: ResultFrameworkReportingHomeService,
          useValue: {
            mySPsList: signal([sp(1, 'SP01', 'Sustainable Farming')]),
            otherSPsList: signal([sp(2, 'SP02', 'Nutritious Diets')]),
            otherProjectsList: signal([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchPaletteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.useRealTimers());

  it('starts closed and opens with an empty query', () => {
    expect(component.open()).toBe(false);
    component.search.query.set('leftover');
    component.openPalette();
    expect(component.open()).toBe(true);
    expect(component.search.query()).toBe('');
  });

  it('toggles, and syncs with a close reported by the dialog (Esc / backdrop)', () => {
    component.toggle();
    expect(component.open()).toBe(true);
    component.toggle();
    expect(component.open()).toBe(false);

    component.openPalette();
    (component as any).onDialogState('closed');
    expect(component.open()).toBe(false);
  });

  // ── the brnCommand traps, asserted so a refactor cannot silently undo them ──────────────────────
  describe('brnCommand contract', () => {
    it('neutralises the built-in filter, which would otherwise double-filter server hits', () => {
      expect((component as any).alwaysVisible('anything', 'unrelated')).toBe(true);
    });

    it('uses stable ids as item values, never the title', () => {
      const r = { id: 10, code: 5844, title: 'Maize', submitterCode: 'SP01', statusId: 1, statusName: 'Editing', versionId: 12 };
      expect(component.resultValue(r)).toBe('result:10');
      expect(component.programValue({ id: 1, code: 'SP01', name: 'Sustainable Farming' })).toBe('program:SP01');
    });
  });

  describe('status pills', () => {
    it('maps each status id to its FIXED fg/bg pair, never a recombination', () => {
      expect(component.statusFg(1)).toBe('var(--pr-status-in-progress-fg)');
      expect(component.statusBg(1)).toBe('var(--pr-status-in-progress-bg)');
      expect(component.statusFg(2)).toBe('var(--pr-status-approved-fg)');
      expect(component.statusBg(2)).toBe('var(--pr-status-approved-bg)');
      expect(component.statusFg(3)).toBe('var(--pr-status-submitted-fg)');
      expect(component.statusBg(3)).toBe('var(--pr-status-submitted-bg)');
    });

    it('falls back to the not-started pair for an unknown status, not to a new colour', () => {
      expect(component.statusFg(99)).toBe('var(--pr-status-not-started-fg)');
      expect(component.statusBg(99)).toBe('var(--pr-status-not-started-bg)');
    });
  });

  describe('programDotColor', () => {
    it('indexes by the code number so adjacent programmes differ', () => {
      expect(programDotColor('SP01')).not.toBe(programDotColor('SP02'));
    });

    it('gives SP01 and SP12 different swatches — the collision the sidebar hit', () => {
      expect(programDotColor('SP01')).not.toBe(programDotColor('SP12'));
    });

    it('falls back for a missing code', () => {
      expect(programDotColor(null)).toBe('var(--pr-chart-3)');
      expect(programDotColor('')).toBe('var(--pr-chart-3)');
    });
  });

  describe('accessible names', () => {
    it('puts the TITLE first — the code and status lead visually but the title is what is hunted', () => {
      expect(
        component.resultAriaLabel({
          id: 10, code: 5844, title: 'Maize resilience', submitterCode: 'SP01', statusId: 1, statusName: 'Editing', versionId: 12
        })
      ).toBe('Maize resilience, SP01, Editing');
    });

    it('drops empty parts instead of leaving dangling commas', () => {
      expect(
        component.resultAriaLabel({
          id: 1, code: 1, title: 'Only a title', submitterCode: '', statusId: 0, statusName: '', versionId: 1
        })
      ).toBe('Only a title');
    });

    it('names a programme row by name then code', () => {
      expect(component.programAriaLabel({ id: 1, code: 'SP01', name: 'Sustainable Farming' })).toBe(
        'Sustainable Farming, SP01'
      );
    });
  });

  describe('activation', () => {
    it('closes then navigates to the result, carrying the phase', () => {
      component.openPalette();
      component.openResult({
        id: 10, code: 5844, title: 'Maize', submitterCode: 'SP01', statusId: 1, statusName: 'Editing', versionId: 12
      });
      expect(component.open()).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/result', 'result-detail', 5844, 'general-information'], {
        queryParams: { phase: 12 }
      });
    });

    it('closes then navigates to the programme, addressed by code', () => {
      component.openPalette();
      component.openProgram({ id: 1, code: 'SP01', name: 'Sustainable Farming' });
      expect(component.open()).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP01', 'overview']);
    });
  });

  describe('scope selector', () => {
    it('maps the empty option to All programs (null), and a value to a programme id', () => {
      (component as any).onScopeChange('2');
      expect(component.search.scope()).toBe(2);
      (component as any).onScopeChange('');
      expect(component.search.scope()).toBeNull();
    });
  });

  // ── rendering ───────────────────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    beforeEach(() => {
      component.openPalette();
      fixture.detectChanges();
    });

    it('prompts before anything is typed, and issues no request', () => {
      expect(html()).toContain('Start typing to search results and programs.');
      expect(getAll).not.toHaveBeenCalled();
    });

    it('asks for 2 characters instead of showing a bare empty group', () => {
      component.search.query.set('m');
      advance();
      expect(html()).toContain('Type at least 2 characters to search results.');
    });

    it('renders the three groups with their counts once results land', () => {
      component.search.query.set('sp0');
      advance();

      const text = html();
      expect(text).toContain('Results (1)');
      expect(text).toContain('Programs (2)');
      expect(text).toContain('Maize resilience in East Africa');
      expect(text).toContain('SP01');
      expect(text).toContain('Editing');
    });

    it('always shows the Indicators group, disabled and tagged Coming soon', () => {
      component.search.query.set('maize');
      advance();
      const text = html();
      expect(text).toContain('Indicators');
      expect(text).toContain('Coming soon');
      expect(text).toContain('Searching indicators is not available yet.');
    });

    it('keeps the Indicators block OUT of the listbox options — an empty brnCommandGroup would vanish, and a disabled option would still be announced', () => {
      component.search.query.set('maize');
      advance();

      const options: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('button[brnCommandItem]'));
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.textContent?.toLowerCase()).not.toContain('coming soon');
      }
      // The block is rendered, but not inside a command group.
      const groups: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[brnCommandGroup]'));
      for (const group of groups) {
        expect(group.textContent).not.toContain('Coming soon');
      }
    });

    it('wires the combobox attributes Brain does not set', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[brnCommandInput]');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-controls')).toBe('pr-palette-list');
      expect(input.getAttribute('aria-label')).toBe('Search');
    });

    it('names each group by its visible heading', () => {
      component.search.query.set('sp0');
      advance();

      const groups: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[brnCommandGroup]'));
      const labelled = groups.map((g) => g.getAttribute('aria-labelledby'));
      expect(labelled).toContain('pr-palette-results-heading');
      expect(labelled).toContain('pr-palette-programs-heading');
      expect(fixture.nativeElement.querySelector('#pr-palette-results-heading')).toBeTruthy();
    });

    it('hides the decorative chip and pill from assistive tech, and labels the row', () => {
      component.search.query.set('maize');
      advance();

      const option: HTMLElement = fixture.nativeElement.querySelector('button[brnCommandItem]');
      expect(option.getAttribute('aria-label')).toBe('Maize resilience in East Africa, SP01, Editing');
      const hidden = option.querySelectorAll('[aria-hidden="true"]');
      expect(hidden.length).toBeGreaterThanOrEqual(2);
    });

    it('marks the list busy only while a request is in flight', () => {
      const list = () => fixture.nativeElement.querySelector('[brnCommandList]');
      component.search.query.set('maize');
      advance();
      expect(list().getAttribute('aria-busy')).toBeNull();
    });

    it('offers All programs plus every programme in the scope select', () => {
      const options: HTMLOptionElement[] = Array.from(fixture.nativeElement.querySelectorAll('#pr-palette-scope option'));
      expect(options[0].textContent?.trim()).toBe('All programs');
      expect(options.map((o) => o.textContent?.trim())).toEqual(['All programs', 'SP01', 'SP02']);
    });

    it('marks the Esc hint decorative — the dialog already handles the key', () => {
      const kbd: HTMLElement = fixture.nativeElement.querySelector('kbd');
      expect(kbd.textContent?.trim()).toBe('Esc');
      expect(kbd.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders no programs group when nothing matches', () => {
      component.search.query.set('zzzz');
      advance();
      expect(html()).not.toContain('Programs (');
    });
  });
});
