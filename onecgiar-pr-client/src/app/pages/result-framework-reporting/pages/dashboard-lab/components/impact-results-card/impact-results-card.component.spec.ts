// @akili-spec results/impact-results-reporting/sp-reporting-entry
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ImpactResultsCardComponent } from './impact-results-card.component';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { IMPACT_AREAS } from '../../../../shared/report-result/impact-areas.constant';

const e6 = (counts: number[], total: number) => ({
  response: { areas: counts.map((count, i) => ({ impact_area_id: i + 1, count })), total }
});

describe('ImpactResultsCardComponent', () => {
  let fixture: ComponentFixture<ImpactResultsCardComponent>;
  let get: jest.Mock;

  async function setup(inputs: { initiativeId?: any; versionId?: any; canReport?: boolean } = {}, api?: () => any, settle = true) {
    get = jest.fn(api ?? (() => of(e6([3, 0, 5, 1, 2], 99))));
    await TestBed.configureTestingModule({
      imports: [ImpactResultsCardComponent],
      providers: [{ provide: ResultsApiService, useValue: { GET_impactLevelCounts: get } }]
    }).compileComponents();
    fixture = TestBed.createComponent(ImpactResultsCardComponent);
    const { initiativeId = 1, versionId = 36, canReport = true } = inputs;
    fixture.componentRef.setInput('initiativeId', initiativeId);
    fixture.componentRef.setInput('versionId', versionId);
    fixture.componentRef.setInput('canReport', canReport);
    fixture.detectChanges();
    if (settle) await fixture.whenStable();
    else await new Promise(r => setTimeout(r, 0));
    fixture.detectChanges();
  }
  const q = (s: string) => fixture.nativeElement.querySelectorAll(s) as NodeListOf<HTMLElement>;
  const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('renders header copy and 5 rows in order with area names', async () => {
    await setup();
    expect(text(q('[data-testid=impact-tag]')[0])).toBe('IMPACT');
    expect(text(fixture.nativeElement)).toContain('Impact results');
    expect(text(fixture.nativeElement)).toContain('5 Impact Areas · no targets');
    expect(text(q('[data-testid=impact-new-chip]')[0])).toBe('NEW');
    const names = Array.from(q('[data-testid=impact-row-name]')).map(text);
    expect(names).toEqual(IMPACT_AREAS.map(a => a.name));
  });

  it('shows E6 total (not the sum of rows) and counts, with 0 rendered as 0', async () => {
    await setup();
    expect(text(q('[data-testid=impact-total]')[0])).toBe('99');
    const counts = Array.from(q('[data-testid=impact-row-count]')).map(text);
    expect(counts).toEqual(['3', '0', '5', '1', '2']);
  });

  it('renders icons as decorative images (alt empty)', async () => {
    await setup();
    const imgs = q('img');
    expect(imgs.length).toBe(5);
    imgs.forEach(i => expect(i.getAttribute('alt')).toBe(''));
  });

  it('button accessible name includes the area; output emits area id', async () => {
    await setup();
    const btns = q('[data-testid=impact-report-btn]');
    expect(btns[2].getAttribute('aria-label')).toBe('Report result for Gender Equality, Youth and Social Inclusion');
    const emitted: number[] = [];
    fixture.componentInstance.reportArea.subscribe(v => emitted.push(v));
    btns[3].click();
    expect(emitted).toEqual([4]);
  });

  it('disables every Report button when canReport is false', async () => {
    await setup({ canReport: false });
    q('[data-testid=impact-report-btn]').forEach(b => expect((b as HTMLButtonElement).disabled).toBe(true));
  });

  it('error state shows a dash with aria-label, never 0; buttons stay enabled', async () => {
    await setup({}, () => throwError(() => new Error('boom')));
    const un = q('[data-testid=count-unavailable]');
    expect(un.length).toBe(6);
    un.forEach(e => {
      expect(text(e)).toBe('—');
      expect(e.getAttribute('aria-label')).toBe('Count unavailable');
    });
    expect(text(q('[data-testid=impact-total]')[0])).toBe('—');
    q('[data-testid=impact-report-btn]').forEach(b => expect((b as HTMLButtonElement).disabled).toBe(false));
  });

  it('loading state shows skeletons and keeps buttons usable', async () => {
    const pending = new Subject<any>();
    await setup({}, () => pending, false);
    expect(q('[data-testid=count-skeleton]').length).toBe(6);
    q('[data-testid=impact-report-btn]').forEach(b => expect((b as HTMLButtonElement).disabled).toBe(false));
  });

  it.each([
    [null, 36],
    [1, null],
    [null, null]
  ])('does not request when an id is null (%s, %s) and shows a dash', async (initiativeId, versionId) => {
    await setup({ initiativeId, versionId });
    expect(get).not.toHaveBeenCalled();
    expect(q('[data-testid=count-unavailable]').length).toBe(6);
  });

  it('re-requests when initiativeId or versionId changes', async () => {
    await setup();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenLastCalledWith(1, 36);
    fixture.componentRef.setInput('versionId', 37);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenLastCalledWith(1, 37);
    fixture.componentRef.setInput('initiativeId', 2);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(get).toHaveBeenLastCalledWith(2, 37);
  });

  it('has no progress bar, ratio, percent, By AOW or chevron', async () => {
    await setup();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('[role=progressbar], progress')).toBeNull();
    expect(html.textContent).not.toMatch(/%|By AOW| of /);
    expect(html.querySelector('ng-icon, [aria-expanded]')).toBeNull();
  });
});
