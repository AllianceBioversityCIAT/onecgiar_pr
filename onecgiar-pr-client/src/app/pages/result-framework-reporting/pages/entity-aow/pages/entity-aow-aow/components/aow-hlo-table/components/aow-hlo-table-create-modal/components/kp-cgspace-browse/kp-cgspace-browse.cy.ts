// @akili-spec changes/kp-multi-repository-browse (KPM-T-9, KPM-AC-15) — Cypress CT sweep of the
// Browse panel's repository source strip: the chip row wraps below 640px CSS without ever causing
// horizontal DOCUMENT overflow (requirements.md §7 Responsiveness), and the partial-failure notice
// / per-repository badges render the way `design.md` §6.3 / `KPM-DD-8` describe. This is a LAYOUT
// gate only — jsdom cannot lay out `flex-wrap`, so the merge/dedup arithmetic, retry payloads and
// the "3 ok -> no notice" branch stay `KPM-TEST-7`'s job (Jest, `kp-cgspace-browse.component.spec.ts`).
//
// Fixture: `ResultsApiService` is stubbed (no `HttpClientTestingModule` — the stub never reaches
// `HttpClient`) with ONE fixed `GET_cgspaceSearch` response — 2 ok sources (CGSpace 18, MELSpace 6)
// + 1 timeout (WorldFish) — and one item deduplicated via `alsoIn` (dedup is server-side, KPM-R-5;
// the merged response only needs to carry the secondary repository/handle on the survivor, per the
// Leader's brief). `GET_cgspaceFacet` returns an empty `values[]` for both calls `ngOnInit` fires.
//
// Mount/viewport/measurement technique mirrors `bilateral-review.cy.ts`'s page-host suite
// (`mountPage`, `assertEffectiveWidth`, `assertNoBodyHorizontalOverflow`) — `cy.mount(Component, {
// providers, componentProperties })` directly on the standalone component, no template wrapper.
// This file's ONLY job is the CT sweep — it does not touch `kp-cgspace-browse.component.*`.
import { of } from 'rxjs';
import { CgspaceItemDto, KpCgspaceBrowseComponent, SourceStatusDto } from './kp-cgspace-browse.component';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';

// ── Fixture: 2 ok sources (CGSpace, MELSpace) + 1 timeout (WorldFish); one item deduplicated ──
const FIXTURE_ITEMS: CgspaceItemDto[] = [
  {
    uuid: 'a1111111-0000-0000-0000-000000000001',
    handle: '10568/111001',
    handleUrl: 'https://hdl.handle.net/10568/111001',
    itemUrl: 'https://cgspace.cgiar.org/items/a1111111-0000-0000-0000-000000000001',
    title: 'Maize productivity and climate adaptation strategies for smallholder farmers',
    type: 'Journal Article',
    year: 2026,
    authors: ['Smith, John', 'Doe, Jane'],
    affiliations: ['CIMMYT'],
    countries: ['Kenya', 'Uganda'],
    doi: '10.1000/maize-abc',
    uri: 'https://hdl.handle.net/10568/111001',
    repository: 'cgspace',
    // KPM-R-5: dedup happens server-side — the merged survivor carries the secondary
    // repository/handle rather than the client ever seeing MELSpace's own duplicate item.
    alsoIn: [
      {
        repository: 'melspace',
        handle: '20.500.11766/222002',
        handleUrl: 'https://hdl.handle.net/20.500.11766/222002',
        itemUrl: 'https://repo.mel.cgiar.org/items/222002'
      }
    ]
  },
  {
    uuid: 'a1111111-0000-0000-0000-000000000002',
    handle: '10568/111003',
    handleUrl: 'https://hdl.handle.net/10568/111003',
    itemUrl: 'https://cgspace.cgiar.org/items/a1111111-0000-0000-0000-000000000002',
    title: 'Maize seed systems: a policy brief for East Africa',
    type: 'Brief',
    year: 2025,
    authors: ['Solo Author'],
    affiliations: ['CIAT'],
    countries: ['Kenya'],
    doi: null,
    uri: 'https://hdl.handle.net/10568/111003',
    repository: 'cgspace'
  }
];

const FIXTURE_SOURCES: SourceStatusDto[] = [
  { repository: 'cgspace', status: 'ok', total: 18, hasMore: true },
  { repository: 'melspace', status: 'ok', total: 6, hasMore: false },
  { repository: 'worldfish', status: 'timeout', total: 0, hasMore: false }
];

function searchResponse() {
  return {
    response: {
      items: FIXTURE_ITEMS,
      page: { number: 0, size: 10, totalElements: 24, totalPages: 3, hasMore: false },
      sources: FIXTURE_SOURCES
    },
    status: 200
  };
}

function facetResponse() {
  return { response: { values: [] } };
}

/** Mounts the real `KpCgspaceBrowseComponent` with a stubbed `ResultsApiService` — same technique
 *  `bilateral-review.cy.ts`'s `mountPage()` uses (`useValue` providers, no HTTP testing module
 *  because the stub never reaches `HttpClient`). `phaseYear`/`isAdmin` are `input()` signals;
 *  `componentProperties` sets them the same way `reporting-aow-table.row-layout.cy.ts` does for
 *  its own signal inputs. */
function mountBrowse() {
  return cy.mount(KpCgspaceBrowseComponent, {
    componentProperties: { phaseYear: 2026, isAdmin: false },
    providers: [
      {
        provide: ResultsApiService,
        useValue: {
          GET_cgspaceSearch: () => of(searchResponse()),
          GET_cgspaceFacet: () => of(facetResponse())
        }
      }
    ]
  });
}

/** AC-15 disqualifier guard: measure and LOG the effective CSS width before any geometry read —
 *  same `assertEffectiveWidth` pattern `bilateral-review.cy.ts` established — and assert on the
 *  MEASURED value, never the requested one. A spread > 4px invalidates that width's measurements
 *  per this task's own disqualifier; this reports the spread rather than silently passing. */
function assertEffectiveWidth(label: string, expected: number): void {
  cy.document().should(doc => {
    const measured = doc.documentElement.clientWidth;
    expect(measured, `${label}: requested viewport width ${expected} -> measured documentElement.clientWidth ${measured}`).to.be.closeTo(expected, 4);
  });
}

function assertNoBodyHorizontalOverflow(label: string): void {
  cy.document().should(doc => {
    const de = doc.documentElement;
    expect(de.scrollWidth, `${label}: documentElement.scrollWidth(${de.scrollWidth}) <= clientWidth(${de.clientWidth})`).to.be.at.most(de.clientWidth);
  });
}

/** KPM-AC-15 row-occupancy check (rework, attempt 2) — REPLACES the attempt-1 height comparison
 *  the Reviewer FAILed as a tautology: strip height vs `Math.max(chipHeights)` is satisfied by the
 *  strip's own `p-[10px]` padding alone (30px chip + 20px padding = 50 > 30) even when nothing
 *  wraps, so it can't tell a wrapped row from an unwrapped one. This measures rounded `top` offsets
 *  instead — a real row-occupancy signal that only changes when chips actually land on different
 *  lines.
 *
 *  "The chip row" is scoped to the three `[data-test^="kp-repo-chip-"]` buttons ONLY (not the
 *  lead-in `Searching 3 CGIAR knowledge repositories` span, not the "Select all" button) —
 *  design.md L135 states the wrap clause as "chips wrap to two rows", specifically about the
 *  chips. The lead-in span carries an icon + longer text that can wrap on its own line for
 *  reasons unrelated to chip wrapping, and the `ml-auto` "Select all" button's flex placement
 *  moves independently of the chips (it only appears when `selectedRepositories().length < 3`,
 *  which — see fixture note in the mobile block below — this fixture never triggers). Keying the
 *  row count to those two would confound the “chips wrap” signal the AC actually asks for. */
function assertChipRowOccupancy(width: number, assertRows: (rowCount: number) => void): void {
  cy.get('[data-test="kp-source-strip"]').should($strip => {
    const strip = $strip[0] as HTMLElement;
    const chips = Array.from(strip.querySelectorAll<HTMLElement>('[data-test^="kp-repo-chip-"]'));
    expect(chips.length, `${width}: three repository chips rendered`).to.eq(3);

    const chipHeights = chips.map(chip => chip.getBoundingClientRect().height);
    chipHeights.forEach((h, i) => {
      expect(h, `${width}: chip ${i} (${chips[i].getAttribute('data-test')}) height(${h.toFixed(1)}) >= 24px`).to.be.at.least(24);
    });

    // Round to the nearest px to absorb sub-pixel layout jitter between chips genuinely on the
    // same row (real browser layout, not jsdom, so fractional px offsets do occur).
    const tops = chips.map(chip => Math.round(chip.getBoundingClientRect().top));
    const rowCount = new Set(tops).size;
    // eslint-disable-next-line no-console
    console.log(`KPM-AC-15 @ ${width}px — chip tops: [${tops.join(', ')}] -> ${rowCount} distinct row(s)`);
    // `cy.log`/other cy commands cannot be invoked from inside a `.should()` retry callback — it
    // would enqueue commands multiple times. `Cypress.log` is the synchronous, non-queued
    // equivalent, safe here and visible in the Command Log / DEBUG output.
    Cypress.log({ name: 'KPM-AC-15', message: `${width}px tops [${tops.join(', ')}] -> ${rowCount} row(s)` });
    assertRows(rowCount);
  });
}

/** Types a query long enough to clear `MIN_QUERY_LENGTH` (3) and lets Cypress' own retry-ability
 *  wait out the real 400 ms debounce (no `fakeAsync` in this harness — real timers) by polling for
 *  the results counter rather than a hard `cy.wait`. */
function searchAndWaitForResults(): void {
  cy.get('input[aria-label="Search the selected repositories"]').type('maize');
  cy.get('[data-test="kp-results-counter"]', { timeout: 10000 }).should('exist');
}

describe('KpCgspaceBrowseComponent — Cypress CT (KPM-T-9)', () => {
  ([
    [1536, 'desktop'],
    [840, 'tablet'],
    [375, 'mobile']
  ] as const).forEach(([width, kind]) => {
    describe(`effective ${width}px — ${kind}`, () => {
      beforeEach(() => {
        // Tall viewport so a native vertical scrollbar never shaves clientWidth (documented quirk
        // in bilateral-review's CLAUDE.md) — this fixture (2 cards) never needs 1200px of height.
        cy.viewport(width, 1200);
        mountBrowse();
        searchAndWaitForResults();
        assertEffectiveWidth(`${width}`, width);
      });

      it(`KPM-AC-15: no horizontal document overflow at ${width}px`, () => {
        assertNoBodyHorizontalOverflow(`${width}`);
      });

      it('KPM-R-7: the partial notice names WorldFish and the repository badges render', () => {
        cy.get('[data-test="kp-partial-notice"]').should('be.visible').and('contain.text', 'WorldFish');
        cy.get('[data-test="kp-item-badge-cgspace"]').should('be.visible');
        cy.get('[data-test="kp-also-in-melspace"]').should('be.visible');
      });

      if (width === 375) {
        it('KPM-AC-15: the chip row wraps at 375px — chip tops occupy >= 2 distinct rows, every chip >= 24px tall', () => {
          assertChipRowOccupancy(width, rowCount => {
            expect(rowCount, `${width}: chip row wraps — distinct top offsets across the 3 chips`).to.be.at.least(2);
          });
        });
      }

      if (width === 1536) {
        it('KPM-AC-15: the chip row does NOT wrap at 1536px — chip tops occupy exactly 1 row (proves the 375px wrap is the breakpoint, not an artifact)', () => {
          assertChipRowOccupancy(width, rowCount => {
            expect(rowCount, `${width}: chip row stays unwrapped — distinct top offsets across the 3 chips`).to.eq(1);
          });
        });
      }
    });
  });
});
