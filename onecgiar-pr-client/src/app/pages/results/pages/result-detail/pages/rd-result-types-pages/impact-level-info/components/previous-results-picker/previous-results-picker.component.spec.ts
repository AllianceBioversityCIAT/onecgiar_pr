// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-4)
// Real CDK dialog behaviour (focus trap/restore, Escape, layout) cannot run under Jest (`@spartan-ng/brain` is a
// stub here); it is covered by `previous-results-picker.cy.ts`.
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { PreviousResultsPickerComponent } from './previous-results-picker.component';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

let mockContext: any = null;
jest.mock('@spartan-ng/brain/dialog', () => ({
  ...jest.requireActual('@spartan-ng/brain/dialog'),
  injectBrnDialogContext: () => mockContext
}));

const item = (id: number) => ({
  result_id: id,
  result_code: id + 1000,
  title: `Result ${id}`,
  result_type_name: 'Policy change',
  phase_name: 'Reporting 2025',
  portfolio_acronym: 'P25',
  status_name: 'Submitted'
});

const page = (ids: number[], over: any = {}) => ({ response: { items: ids.map(item), meta: { total: ids.length, page: 1, limit: 20, totalPages: 1, ...over } } });

describe('PreviousResultsPickerComponent', () => {
  let fixture: ComponentFixture<PreviousResultsPickerComponent>;
  let component: PreviousResultsPickerComponent;
  let search: jest.Mock;
  let close: jest.Mock;
  const el = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el().querySelector(sel) as HTMLElement | null;
  const qa = (sel: string) => Array.from(el().querySelectorAll(sel)) as HTMLElement[];
  const settle = () => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();
  };

  function setup(opts: { search?: jest.Mock; context?: any } = {}) {
    mockContext = opts.context === undefined ? { resultId: 77, initialSelection: [item(1)] } : opts.context;
    search = opts.search ?? jest.fn().mockReturnValue(of(page([1, 2, 3])));
    close = jest.fn();
    const resultsSE = {
      GET_impactPreviousResultsSearch: search,
      GET_versioning: jest.fn().mockReturnValue(
        of({
          response: [
            { id: 5, phase_name: 'Reporting 2025', phase_name_status: 'Reporting 2025 - (Open)', obj_portfolio: { id: 3, acronym: 'P25' } },
            { id: 4, phase_name: 'Reporting 2024', phase_name_status: 'Reporting 2024 - (Closed)' }
          ]
        })
      ),
      GET_resultTypes: jest.fn().mockReturnValue(of({ response: [{ id: 9, name: 'Impact contribution' }] }))
    };
    TestBed.configureTestingModule({
      imports: [PreviousResultsPickerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE } },
        { provide: BrnDialogRef, useValue: { close } }
      ]
    });
    fixture = TestBed.createComponent(PreviousResultsPickerComponent);
    component = fixture.componentInstance;
    settle();
  }

  const type = (value: string) => {
    const input = q('[data-cy="impact-picker-search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('opens with ONE request: excludeResultId, limit 20, page 1, no query', fakeAsync(() => {
    setup();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0]).toEqual({ q: '', versionId: null, typeIds: [], excludeResultId: 77, page: 1, limit: 20 });
    expect(qa('[data-cy="impact-picker-item"]')).toHaveLength(3);
  }));

  it('a typing burst sends exactly one request, after 300 ms', fakeAsync(() => {
    setup();
    search.mockClear();
    type('r');
    tick(100);
    type('ri');
    tick(100);
    type('ric');
    tick(100);
    type('rice');
    tick(299);
    expect(search).not.toHaveBeenCalled();
    tick(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0][0].q).toBe('rice');
    flush();
  }));

  it('a new query goes back to page 1', fakeAsync(() => {
    setup({ search: jest.fn().mockReturnValue(of(page([1, 2], { totalPages: 3 }))) });
    component.goToPage(3);
    expect(search.mock.calls.at(-1)[0].page).toBe(3);
    type('rice');
    tick(300);
    expect(search.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ q: 'rice', page: 1 }));
    flush();
  }));

  it('a stale response never overwrites a newer one (switchMap)', fakeAsync(() => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    setup({ search: jest.fn().mockReturnValueOnce(of(page([1]))).mockReturnValueOnce(first).mockReturnValueOnce(second) });
    type('a');
    tick(300);
    type('ab');
    tick(300);
    second.next(page([20]));
    first.next(page([10]));
    settle();
    expect(component.items().map(i => i.result_id)).toEqual([20]);
  }));

  it('filters send versionId / typeIds and reset to page 1', fakeAsync(() => {
    setup({ search: jest.fn().mockReturnValue(of(page([1], { totalPages: 2 }))) });
    component.goToPage(2);
    component.onVersionChange(5);
    expect(search.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ versionId: 5, page: 1 }));
    component.onTypesChange([9, 2]);
    expect(search.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ versionId: 5, typeIds: [9, 2], page: 1 }));
    component.onVersionChange('all');
    expect(search.mock.calls.at(-1)[0].versionId).toBeNull();
    // The portfolio acronym is in the label; a phase without `obj_portfolio` keeps the plain label. Only versionId is sent.
    expect(component.phaseOptions().map(o => o.label)).toEqual(['All phases', 'P25 · Reporting 2025 - (Open)', 'Reporting 2024 - (Closed)']);
    expect(Object.keys(search.mock.calls.at(-1)[0])).not.toContain('portfolioId');
    expect(q('[data-cy="impact-picker-phase-filter"]')?.getAttribute('role')).toBe('group');
    expect(q('[data-cy="impact-picker-phase-filter"]')?.getAttribute('aria-labelledby')).toBe('impact-picker-phase-label');
    expect(q('[data-cy="impact-picker-type-filter"]')?.getAttribute('aria-labelledby')).toBe('impact-picker-type-label');
    expect(q('#impact-picker-type-label')?.textContent).toContain('Result type');
    expect(component.typeOptions()).toEqual([{ value: 9, label: 'Impact result / Impact contribution' }]);
  }));

  it('an already selected item shows "Selected", is disabled and cannot be added twice', fakeAsync(() => {
    setup();
    const items = qa('[data-cy="impact-picker-item"]');
    const first = items[0].querySelector('button') as HTMLButtonElement;
    expect(first.textContent?.trim()).toBe('Selected');
    expect(first.disabled).toBe(true);
    component.add(item(1));
    expect(component.selection().map(s => s.result_id)).toEqual([1]);
    (items[1].querySelector('button') as HTMLButtonElement).click();
    settle();
    expect(component.selection().map(s => s.result_id)).toEqual([1, 2]);
    expect((qa('[data-cy="impact-picker-item"]')[1].querySelector('button') as HTMLButtonElement).textContent?.trim()).toBe('Selected');
  }));

  it('Done emits the working selection; Cancel emits undefined', fakeAsync(() => {
    setup();
    component.add(item(2));
    component.remove(1);
    (q('[data-cy="impact-picker-done"]') as HTMLButtonElement).click();
    expect(close).toHaveBeenLastCalledWith([item(2)]);
    (q('[data-cy="impact-picker-cancel"]') as HTMLButtonElement).click();
    expect(close).toHaveBeenLastCalledWith(undefined);
  }));

  it('the context list is copied, never mutated', fakeAsync(() => {
    const initial = [item(1)];
    setup({ context: { resultId: 77, initialSelection: initial } });
    component.add(item(2));
    expect(initial).toHaveLength(1);
  }));

  it('empty state when nothing matches', fakeAsync(() => {
    setup({ search: jest.fn().mockReturnValue(of(page([], { total: 0, totalPages: 0 }))) });
    expect(q('[data-cy="impact-picker-empty"]')).not.toBeNull();
    expect(q('[data-cy="impact-picker-item"]')).toBeNull();
  }));

  it('error state with retry that loads again', fakeAsync(() => {
    setup({ search: jest.fn().mockReturnValueOnce(throwError(() => new Error('x'))).mockReturnValue(of(page([2]))) });
    expect(q('[data-cy="impact-picker-error"]')).not.toBeNull();
    (q('[data-cy="impact-picker-retry"]') as HTMLButtonElement).click();
    settle();
    expect(q('[data-cy="impact-picker-error"]')).toBeNull();
    expect(qa('[data-cy="impact-picker-item"]')).toHaveLength(1);
  }));

  it('paging buttons follow meta.totalPages', fakeAsync(() => {
    setup({ search: jest.fn().mockReturnValue(of(page([1, 2], { totalPages: 2 }))) });
    // `[disabled]` goes through `BrnButton`, a stub under Jest, so assert the state it is bound to.
    expect(component.hasPrev()).toBe(false);
    expect(component.hasNext()).toBe(true);
    (q('[data-cy="impact-picker-next"]') as HTMLButtonElement).click();
    expect(search.mock.calls.at(-1)[0].page).toBe(2);
    component.goToPage(1);
    expect(search.mock.calls.at(-1)[0].page).toBe(1);
    component.goToPage(0);
    component.goToPage(9);
    expect(search.mock.calls.at(-1)[0].page).toBe(1);
  }));

  it('without a dialog context it still renders (no exclusion, empty selection)', fakeAsync(() => {
    setup({ context: null });
    expect(search.mock.calls[0][0].excludeResultId).toBeNull();
    expect(component.selection()).toEqual([]);
  }));
});
