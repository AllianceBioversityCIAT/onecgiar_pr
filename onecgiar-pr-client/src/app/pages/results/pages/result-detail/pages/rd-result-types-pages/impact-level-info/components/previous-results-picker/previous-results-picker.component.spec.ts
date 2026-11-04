// @akili-spec results/impact-results-reporting/impact-previous-results-dropdown (IPD-T-1)
// Every param assertion reads the mocked GET_impactPreviousResultsSearch call args (not template text).
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { PreviousResultsPickerComponent } from './previous-results-picker.component';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

const item = (id: number) => ({
  result_id: id,
  result_code: id + 1000,
  title: `Result ${id}`,
  result_type_name: 'Policy change',
  phase_name: 'Reporting 2025',
  portfolio_acronym: 'P25',
  status_name: 'Submitted'
});

const page = (ids: number[], meta: any = {}) => ({ response: { items: ids.map(item), meta: { total: ids.length, page: 1, limit: 20, totalPages: 1, ...meta } } });

describe('PreviousResultsPickerComponent (inline dropdown)', () => {
  let fixture: ComponentFixture<PreviousResultsPickerComponent>;
  let component: PreviousResultsPickerComponent;
  let search: jest.Mock;
  let emitted: any[][];
  const el = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => el().querySelector(sel) as HTMLElement | null;
  const qa = (sel: string) => Array.from(el().querySelectorAll(sel)) as HTMLElement[];
  const settle = () => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();
  };
  const lastParams = () => search.mock.calls[search.mock.calls.length - 1][0];
  const openPanel = () => {
    q('[data-cy="impact-picker-field"]')!.click();
    settle();
  };
  const typeText = (value: string) => {
    const input = q('[data-cy="impact-picker-search"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const chip = (label: string) => qa('[data-cy="impact-picker-type"]').find(button => button.textContent?.includes(label))!;
  const segment = (label: string) => qa('[data-cy="impact-picker-portfolio"]').find(button => button.textContent?.trim() === label)!;

  function setup(opts: { search?: jest.Mock; selection?: any[] } = {}) {
    search = opts.search ?? jest.fn().mockReturnValue(of(page([1, 2, 3])));
    emitted = [];
    const resultsSE = {
      GET_impactPreviousResultsSearch: search,
      GET_versioning: jest.fn().mockReturnValue(
        of({
          response: [
            { id: 5, phase_name: 'Reporting 2025', obj_portfolio: { id: 3, acronym: 'P25' } },
            { id: 6, phase_name: 'Reporting 2026', obj_portfolio: { id: 3, acronym: 'P25' } },
            { id: 4, phase_name: 'Reporting 2022', obj_portfolio: { id: 2, acronym: 'P22' } },
            { id: 1, phase_name: 'No portfolio' }
          ]
        })
      ),
      GET_resultTypes: jest.fn().mockReturnValue(
        of({
          response: [
            { id: 1, name: 'Policy change' },
            { id: 9, name: 'Impact contribution' }
          ]
        })
      )
    };
    TestBed.configureTestingModule({ imports: [PreviousResultsPickerComponent], providers: [{ provide: ApiService, useValue: { resultsSE } }] });
    fixture = TestBed.createComponent(PreviousResultsPickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('resultId', 77);
    fixture.componentRef.setInput('selection', opts.selection ?? [item(1)]);
    component.selectionChange.subscribe(list => emitted.push(list));
    fixture.detectChanges();
  }

  it('makes no E5 call before the first open, then exactly one with excludeResultId and no versionId', fakeAsync(() => {
    setup();
    settle();
    expect(search).not.toHaveBeenCalled();
    openPanel();
    expect(search).toHaveBeenCalledTimes(1);
    expect(lastParams()).toEqual({ q: '', portfolioId: null, typeIds: [], excludeResultId: 77, page: 1, limit: 20 });
    expect(lastParams()).not.toHaveProperty('versionId');
    expect(qa('[data-cy="impact-picker-item"]')).toHaveLength(3);
    // closing and reopening does not reload
    q('[data-cy="impact-picker-close"]')!.click();
    settle();
    openPanel();
    expect(search).toHaveBeenCalledTimes(1);
  }));

  it('typology chip toggles typeIds and sends portfolioId (never versionId) for P25; All sends none', fakeAsync(() => {
    setup();
    openPanel();
    expect(qa('[data-cy="impact-picker-portfolio"]').map(b => b.textContent?.trim())).toEqual(['All', 'P25', 'P22']);

    chip('Policy change').click();
    settle();
    expect(lastParams().typeIds).toEqual([1]);
    expect(chip('Policy change').getAttribute('aria-pressed')).toBe('true');

    segment('P25').click();
    settle();
    expect(lastParams()).toEqual({ q: '', portfolioId: 3, typeIds: [1], excludeResultId: 77, page: 1, limit: 20 });
    expect(lastParams()).not.toHaveProperty('versionId');
    expect(segment('P25').getAttribute('aria-pressed')).toBe('true');

    chip('Policy change').click();
    settle();
    expect(lastParams().typeIds).toEqual([]);

    segment('All').click();
    settle();
    expect(lastParams().portfolioId).toBeNull();
    expect(search.mock.calls.every(call => call[0].excludeResultId === 77)).toBe(true);
  }));

  it('a typing burst sends one request after 300 ms with q trimmed', fakeAsync(() => {
    setup();
    openPanel();
    search.mockClear();
    typeText('w');
    tick(100);
    typeText('wa');
    tick(100);
    typeText(' water ');
    tick(299);
    expect(search).not.toHaveBeenCalled();
    tick(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(lastParams().q).toBe('water');
    expect(lastParams().page).toBe(1);
    flush();
  }));

  it('drops a stale response: the first request answering last does not overwrite the list', fakeAsync(() => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    setup({ search: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) });
    openPanel();
    chip('Policy change').click();
    fixture.detectChanges();
    expect(search).toHaveBeenCalledTimes(2);
    second.next(page([20]));
    second.complete();
    first.next(page([10, 11]));
    first.complete();
    settle();
    expect(component.items().map(i => i.result_id)).toEqual([20]);
  }));

  it('a stale Load more is dropped: a filter change in between never gets the old page appended', fakeAsync(() => {
    const more = new Subject<any>();
    const fresh = new Subject<any>();
    setup({ search: jest.fn().mockReturnValueOnce(of(page([1, 2], { totalPages: 2, total: 4 }))).mockReturnValueOnce(more).mockReturnValueOnce(fresh) });
    openPanel();
    q('[data-cy="impact-picker-load-more"]')!.click();
    expect(lastParams().page).toBe(2);
    segment('P22').click(); // filter change while page 2 is in flight
    fixture.detectChanges();
    expect(lastParams().page).toBe(1);
    more.next(page([3, 4], { totalPages: 2, total: 4 }));
    fresh.next(page([9], { total: 1 }));
    settle();
    expect(component.items().map(i => i.result_id)).toEqual([9]);
  }));

  it('Load more appends page 2 (not replaces) and the button disappears on the last page', fakeAsync(() => {
    const searchMock = jest
      .fn()
      .mockReturnValueOnce(of(page([1, 2], { totalPages: 2, total: 4 })))
      .mockReturnValueOnce(of(page([3, 4], { page: 2, totalPages: 2, total: 4 })));
    setup({ search: searchMock });
    openPanel();
    expect(qa('[data-cy="impact-picker-item"]')).toHaveLength(2);
    expect(q('[data-cy="impact-picker-load-more"]')).not.toBeNull();
    q('[data-cy="impact-picker-load-more"]')!.click();
    settle();
    expect(lastParams().page).toBe(2);
    expect(qa('[data-cy="impact-picker-item"]')).toHaveLength(4);
    expect(component.items().map(i => i.result_id)).toEqual([1, 2, 3, 4]);
    expect(component.page()).toBe(component.totalPages());
    expect(q('[data-cy="impact-picker-load-more"]')).toBeNull();
  }));

  it('Reset filters clears q, chips and portfolio and reloads page 1', fakeAsync(() => {
    setup();
    openPanel();
    chip('Policy change').click();
    segment('P25').click();
    typeText('water');
    tick(300);
    settle();
    expect(lastParams()).toEqual({ q: 'water', portfolioId: 3, typeIds: [1], excludeResultId: 77, page: 1, limit: 20 });
    const calls = search.mock.calls.length;
    q('[data-cy="impact-picker-reset"]')!.click();
    settle();
    expect(search.mock.calls.length).toBe(calls + 1);
    expect(lastParams()).toEqual({ q: '', portfolioId: null, typeIds: [], excludeResultId: 77, page: 1, limit: 20 });
    expect((q('[data-cy="impact-picker-search"]') as HTMLInputElement).value).toBe('');
    expect(chip('Policy change').getAttribute('aria-pressed')).toBe('false');
    expect(segment('All').getAttribute('aria-pressed')).toBe('true');
  }));

  it('typing the same query again after Reset or the clear (x) still sends a request', fakeAsync(() => {
    setup();
    openPanel();
    typeText('water');
    tick(300);
    settle();
    q('[data-cy="impact-picker-reset"]')!.click();
    settle();
    search.mockClear();
    typeText('water');
    tick(300);
    settle();
    expect(search).toHaveBeenCalledTimes(1);
    expect(lastParams().q).toBe('water');

    q('[data-cy="impact-picker-clear-search"]')!.click();
    settle();
    search.mockClear();
    typeText('water');
    tick(300);
    settle();
    expect(search).toHaveBeenCalledTimes(1);
    expect(lastParams().q).toBe('water');
  }));

  it('outside click returns focus to the field only when it would be lost', fakeAsync(() => {
    setup();
    openPanel();
    (q('[data-cy="impact-picker-search"]') as HTMLInputElement).focus();
    document.body.click();
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-cy="impact-picker-field"]'));

    openPanel();
    const other = document.createElement('button');
    document.body.appendChild(other);
    other.focus();
    other.click();
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();
    expect(document.activeElement).toBe(other);
    other.remove();
  }));

  it('row toggle emits the added / removed array; filter changes and Clear selection behave', fakeAsync(() => {
    setup({ selection: [item(1)] });
    openPanel();
    expect(emitted).toEqual([]); // opening / loading / filtering never emits
    chip('Policy change').click();
    settle();
    expect(emitted).toEqual([]);

    const checks = qa('[data-cy="impact-picker-check"]') as HTMLInputElement[];
    expect(checks.map(c => c.checked)).toEqual([true, false, false]);
    checks[1].click();
    expect(emitted[0].map(i => i.result_id)).toEqual([1, 2]);
    checks[0].click();
    expect(emitted[1]).toEqual([]);

    expect(q('[data-cy="impact-picker-count"]')!.textContent).toContain('1 results selected');
    q('[data-cy="impact-picker-clear"]')!.click();
    expect(emitted[2]).toEqual([]);
  }));

  it('hides Clear selection with nothing selected', fakeAsync(() => {
    setup({ selection: [] });
    openPanel();
    expect(q('[data-cy="impact-picker-clear"]')).toBeNull();
    expect(q('[data-cy="impact-picker-count"]')!.textContent).toContain('0 results selected');
  }));

  it('error shows Retry, emits nothing and Retry reloads; 0 items shows the empty text', fakeAsync(() => {
    const searchMock = jest
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('boom')))
      .mockReturnValueOnce(of(page([])));
    setup({ search: searchMock });
    openPanel();
    expect(q('[data-cy="impact-picker-error"]')!.textContent).toContain('Results could not be loaded');
    expect(emitted).toEqual([]);
    expect(q('[data-cy="impact-picker-empty"]')).toBeNull();
    q('[data-cy="impact-picker-retry"]')!.click();
    settle();
    expect(q('[data-cy="impact-picker-error"]')).toBeNull();
    expect(q('[data-cy="impact-picker-empty"]')!.textContent).toContain('No results match your search');
  }));

  it('Escape and Close return focus to the field and keep the selection; outside click closes', fakeAsync(() => {
    setup();
    openPanel();
    q('[data-cy="impact-picker-search"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();
    expect(document.activeElement).toBe(q('[data-cy="impact-picker-field"]'));
    expect(emitted).toEqual([]);

    openPanel();
    q('[data-cy="impact-picker-close"]')!.click();
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();

    openPanel();
    q('[data-cy="impact-picker-panel"]')!.click(); // inside: stays open
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).not.toBeNull();
    document.body.click(); // outside
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();

    openPanel();
    q('[data-cy="impact-picker-field"]')!.click(); // field toggles closed
    settle();
    expect(q('[data-cy="impact-picker-panel"]')).toBeNull();
  }));

  it('renders the row label [portfolio · phase] code · type with status and title', fakeAsync(() => {
    setup();
    openPanel();
    const row = qa('[data-cy="impact-picker-item"]')[0];
    expect(row.textContent).toContain('[P25 · Reporting 2025] 1001');
    expect(row.textContent).toContain('Policy change');
    expect(row.textContent).toContain('Submitted');
    expect(row.textContent).toContain('Result 1');
  }));
});
