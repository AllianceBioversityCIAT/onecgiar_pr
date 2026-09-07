// @akili-spec changes/reporting-favorite-indicators
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingAowTableComponent, ReportingAowGroup, ReportingIndicator } from './reporting-aow-table.component';
import { favoriteKeyOf } from '../../services/reporting-favorites.service';

/**
 * Star toggle + favorites empty state (RFI-T-2). Kept as its own file per `design.md` §10 (new
 * spec files only, merge-friendly with `reporting-hierarchical-search-filters`).
 *
 * `favoriteKeyOf` lives in `reporting-favorites.service.ts`, which only pulls in `ApiService` and
 * a type-only import of this component — no echarts chain — so the echarts mock block the sibling
 * `reporting-aow-table.component.spec.ts` needs (because it also imports `buildAowBannerStats`
 * from `dashboard-lab.component`) is unnecessary here.
 */
describe('ReportingAowTableComponent — favorites (RFI-T-2)', () => {
  let fixture: ComponentFixture<ReportingAowTableComponent>;
  let component: ReportingAowTableComponent;

  const row = (over: Partial<ReportingIndicator> = {}): ReportingIndicator => ({
    indicator_id: 1,
    indicator_description: 'Number of knowledge products published',
    target_value_sum: '3',
    actual_achieved_value_sum: 0,
    progress_percentage: 0,
    unit_messurament: 'Number',
    result_type_name: 'Knowledge product',
    __hlo: 'HLO4.AOW1.IO1 Foster motivations',
    __tier: 'output',
    __aowCode: 'AOW01',
    ...over
  });

  const group = (rows: ReportingIndicator[], over: Partial<ReportingAowGroup> = {}): ReportingAowGroup => ({
    aow: { id: 1, code: 'AOW01', name: 'Market Intelligence', progress: 38 },
    indicators: rows,
    count: rows.length,
    loading: false,
    ...over
  });

  const build = async (groups: ReportingAowGroup[], inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({ imports: [ReportingAowTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(ReportingAowTableComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groups', groups);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
  };

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  /** Same body as the sibling spec's `openAow` — cards arrive collapsed (P18). */
  const openAow = (code = 'AOW01') => {
    component.toggle(`aow::${code}`, false);
    const g = component.groups().find(gr => gr.aow.code === code);
    if (g) {
      for (const hlo of component.hloGroupsOf(g)) {
        if (!component.isOpen(hlo.key, component.isDefaultOpenHlo())) {
          component.toggle(hlo.key, false);
        }
      }
    }
    fixture.detectChanges();
  };

  /** Favorite-toggle buttons under currently OPEN grouped panels only (collapsed panels stay mounted). */
  const groupedStars = (): NodeListOf<HTMLButtonElement> =>
    (fixture.nativeElement as HTMLElement).querySelectorAll(
      'section > .pr-collapse.is-open .pr-collapse.is-open [data-testid="favorite-toggle"]'
    );

  const flatStars = (): NodeListOf<HTMLButtonElement> =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('.pr-flat-cell [data-testid="favorite-toggle"]');

  // ── AC-1 — grouped ───────────────────────────────────────────────────────
  describe('grouped card (AC-1)', () => {
    it('clicking the star toggles favorite and does NOT open the row', async () => {
      await build([group([row({ indicator_id: 1 }), row({ indicator_id: 2 })])]);
      openAow();
      const toggleSpy = jest.fn();
      const openSpy = jest.fn();
      component.toggleFavorite.subscribe(toggleSpy);
      component.openRow.subscribe(openSpy);

      const stars = groupedStars();
      expect(stars.length).toBe(2);
      stars[0].click();

      expect(toggleSpy).toHaveBeenCalledTimes(1);
      expect(toggleSpy).toHaveBeenCalledWith(expect.objectContaining({ indicator_id: 1 }));
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('renders aria-pressed / glyph / label per favorite state', async () => {
      const a = row({ indicator_id: 1 });
      const b = row({ indicator_id: 2 });
      await build([group([a, b])], { favoriteKeys: new Set([favoriteKeyOf(a)]) });
      openAow();

      const stars = groupedStars();
      expect(stars.length).toBe(2);

      expect(stars[0].getAttribute('aria-pressed')).toBe('true');
      expect(stars[0].getAttribute('aria-label')).toBe('Remove from favorites');
      expect(stars[0].querySelector('.material-icons-round')?.textContent?.trim()).toBe('star');

      expect(stars[1].getAttribute('aria-pressed')).toBe('false');
      expect(stars[1].getAttribute('aria-label')).toBe('Add to favorites');
      expect(stars[1].querySelector('.material-icons-round')?.textContent?.trim()).toBe('star_outline');
    });
  });

  // ── AC-2 — flat ──────────────────────────────────────────────────────────
  describe('flat table (AC-2)', () => {
    it('clicking the star toggles favorite and does NOT open the row', async () => {
      await build([group([row({ indicator_id: 1 }), row({ indicator_id: 2 })])], { viewMode: 'flat' });
      const toggleSpy = jest.fn();
      const openSpy = jest.fn();
      component.toggleFavorite.subscribe(toggleSpy);
      component.openRow.subscribe(openSpy);

      const stars = flatStars();
      expect(stars.length).toBe(2);
      stars[0].click();

      expect(toggleSpy).toHaveBeenCalledTimes(1);
      expect(toggleSpy).toHaveBeenCalledWith(expect.objectContaining({ indicator_id: 1 }));
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('renders aria-pressed / glyph / label per favorite state', async () => {
      const a = row({ indicator_id: 1 });
      const b = row({ indicator_id: 2 });
      await build([group([a, b])], { viewMode: 'flat', favoriteKeys: new Set([favoriteKeyOf(a)]) });

      const stars = flatStars();
      expect(stars.length).toBe(2);

      expect(stars[0].getAttribute('aria-pressed')).toBe('true');
      expect(stars[0].getAttribute('aria-label')).toBe('Remove from favorites');
      expect(stars[0].querySelector('.material-icons-round')?.textContent?.trim()).toBe('star');

      expect(stars[1].getAttribute('aria-pressed')).toBe('false');
      expect(stars[1].getAttribute('aria-label')).toBe('Add to favorites');
      expect(stars[1].querySelector('.material-icons-round')?.textContent?.trim()).toBe('star_outline');
    });
  });

  // ── AC-10 — zero favorites, switch on ───────────────────────────────────
  describe('favorites-only empty state (AC-10)', () => {
    it('grouped: shows the RFI-R-2.6 copy and "Show all indicators" emits exitFavoritesOnly', async () => {
      await build([], { favoritesOnly: true, favoriteKeys: new Set<string>() });
      expect(text()).toContain('No favorite indicators yet. Use the ★ on any indicator row to build your focus list.');

      const spy = jest.fn();
      component.exitFavoritesOnly.subscribe(spy);
      const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'Show all indicators'
      ) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      btn.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('flat: shows the RFI-R-2.6 copy and "Show all indicators" emits exitFavoritesOnly', async () => {
      await build([], { viewMode: 'flat', favoritesOnly: true, favoriteKeys: new Set<string>() });
      expect(text()).toContain('No favorite indicators yet. Use the ★ on any indicator row to build your focus list.');

      const spy = jest.fn();
      component.exitFavoritesOnly.subscribe(spy);
      const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'Show all indicators'
      ) as HTMLButtonElement;
      expect(btn).toBeTruthy();
      btn.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC-16 — favorites present but hidden by another filter ─────────────
  describe('favorites present but hidden by other filters (AC-16)', () => {
    it('shows the generic "No indicators match your filters." state, not the favorites copy', async () => {
      const a = row({ indicator_id: 1, progress_percentage: 0 }); // statusOf(a) === 'not-started'
      await build([group([a])], {
        favoritesOnly: true,
        favoriteKeys: new Set([favoriteKeyOf(a)]),
        filtersActive: true,
        statusFilter: 'achieved' // does not match statusOf(a) — row a is hidden
      });

      expect(text()).toContain('No indicators match your filters.');
      expect(text()).not.toContain('No favorite indicators yet');
    });
  });

  // ── Loading guard ────────────────────────────────────────────────────────
  describe('loading guard', () => {
    it('a loading group with no rows renders no empty-state text', async () => {
      await build([group([], { loading: true })], { filtersActive: true });
      expect(text()).toContain('Loading indicators…');
      expect(text()).not.toContain('No indicators match the current filters.');
      expect(text()).not.toContain('has no planned indicators yet');
      expect(text()).not.toContain('No favorite indicators yet');
    });
  });

  // ── AC-14 — key parity with the service ─────────────────────────────────
  describe('favoriteKeyOf / rowKey parity (AC-14)', () => {
    it('matches for a row with center_id and __aowCode', async () => {
      await build([group([row()])]);
      const r = row({ indicator_id: 5, center_id: 'CIAT', __aowCode: 'AOW02' });
      expect(favoriteKeyOf(r)).toBe(component.rowKey(r));
    });

    it('matches for a row missing center_id and __aowCode', async () => {
      await build([group([row()])]);
      const r = row({ indicator_id: 6, center_id: undefined, __aowCode: undefined });
      expect(favoriteKeyOf(r)).toBe(component.rowKey(r));
    });
  });
});
