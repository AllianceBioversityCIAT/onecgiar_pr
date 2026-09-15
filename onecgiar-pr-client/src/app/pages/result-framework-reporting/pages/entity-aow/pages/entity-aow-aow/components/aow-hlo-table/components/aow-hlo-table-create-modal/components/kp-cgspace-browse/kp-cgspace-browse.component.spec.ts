import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { CgspaceItemDto, KP_LAST_REPOSITORY_TITLE, KpCgspaceBrowseComponent } from './kp-cgspace-browse.component';
import { ALL_KP_REPOSITORIES } from './kp-repositories.constants';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

describe('KpCgspaceBrowseComponent', () => {
  let component: KpCgspaceBrowseComponent;
  let fixture: ComponentFixture<KpCgspaceBrowseComponent>;
  let mockResultsApiService: {
    GET_cgspaceSearch: jest.Mock;
    GET_cgspaceFacet: jest.Mock;
  };

  const sampleItem1: CgspaceItemDto = {
    uuid: '11111111-2222-3333-4444-555555555555',
    handle: '10568/128401',
    handleUrl: 'https://hdl.handle.net/10568/128401',
    itemUrl: 'https://cgspace.cgiar.org/items/11111111-2222-3333-4444-555555555555',
    title: 'Maize productivity and climate adaptation in Africa',
    type: 'Journal Article',
    year: 2026,
    authors: ['Smith, John', 'Doe, Jane', 'Silva, Carlos'],
    affiliations: ['Alliance of Bioversity and CIAT'],
    countries: ['Kenya', 'Colombia', 'Ethiopia', 'Peru'],
    doi: 'https://hdl.handle.net/10568/128401',
    uri: 'https://hdl.handle.net/10568/128401',
    repository: 'cgspace'
  };

  const sampleItemSingleAuthor: CgspaceItemDto = {
    uuid: '22222222-3333-4444-5555-666666666666',
    handle: '10568/99999',
    handleUrl: 'https://hdl.handle.net/10568/99999',
    itemUrl: 'https://cgspace.cgiar.org/items/22222222-3333-4444-5555-666666666666',
    title: 'Single Author Study',
    type: 'Report',
    year: 2026,
    authors: ['Solo Author'],
    affiliations: ['CIP'],
    countries: ['Peru'],
    doi: null,
    uri: 'https://hdl.handle.net/10568/99999'
  };

  beforeEach(async () => {
    mockResultsApiService = {
      GET_cgspaceSearch: jest.fn().mockReturnValue(
        of({
          response: {
            items: [],
            page: { number: 0, size: 10, totalElements: 0, totalPages: 0 }
          },
          message: 'CGSpace search results',
          status: 200
        })
      ),
      GET_cgspaceFacet: jest.fn().mockImplementation((name: string) => {
        if (name === 'itemtype') {
          return of({
            response: {
              name: 'itemtype',
              values: [
                { label: 'Journal Article', value: 'Journal Article', count: 100 },
                { label: 'Report', value: 'Report', count: 50 }
              ]
            }
          });
        }
        if (name === 'affiliation') {
          return of({
            response: {
              name: 'affiliation',
              values: [
                { label: 'Alliance of Bioversity and CIAT', value: 'Alliance of Bioversity and CIAT', count: 80 },
                { label: 'CIP', value: 'CIP', count: 40 }
              ]
            }
          });
        }
        return of({ response: { values: [] } });
      })
    };

    await TestBed.configureTestingModule({
      imports: [
        KpCgspaceBrowseComponent,
        CommonModule,
        FormsModule,
        CustomFieldsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: ResultsApiService, useValue: mockResultsApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KpCgspaceBrowseComponent);
    component = fixture.componentInstance;
    // Override so fakeAsync tests do not wait 600 ms per retry (KCSR-DD-2)
    component.retryDelayMs = 0;
  });

  it('should create and load facets on init', () => {
    fixture.componentRef.setInput('phaseYear', 2026);
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockResultsApiService.GET_cgspaceFacet).toHaveBeenCalledWith('itemtype', undefined, undefined, ALL_KP_REPOSITORIES);
    expect(mockResultsApiService.GET_cgspaceFacet).toHaveBeenCalledWith('affiliation', undefined, undefined, ALL_KP_REPOSITORIES);
    expect(component.typeOptions().length).toBe(2);
    expect(component.centerOptions().length).toBe(2);
    expect(component.selectedYear()).toBe(2026);
  });

  describe('Search Debounce and Enter Key (1 & 2)', () => {
    it('should debounce text typing by 400ms before triggering search', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();

      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();

      tick(399);
      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();

      tick(1);
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith({
        query: 'maize',
        page: 0,
        size: 10,
        year: 2026,
        repository: 'cgspace,melspace,worldfish'
      });
    }));

    it('should execute search immediately on Enter key press without waiting for 400ms debounce', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onEnter();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith({
        query: 'maize',
        page: 0,
        size: 10,
        year: 2026,
        repository: 'cgspace,melspace,worldfish'
      });

      // Advance time past debounce to ensure it is not called a second time
      tick(500);
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
    }));
  });

  describe('Loading State and Input Availability (3)', () => {
    it('should keep search inputs and filter selects enabled while loading (R-11)', () => {
      fixture.componentRef.setInput('phaseYear', 2026);
      component.status.set('loading');
      fixture.detectChanges();

      const searchInput = fixture.debugElement.query(By.css('input[type="text"]'));
      expect(searchInput).toBeTruthy();
      expect(searchInput.nativeElement.disabled).toBe(false);

      const loadingEl = fixture.debugElement.query(By.css('[data-test="cgspace-loading"]'));
      expect(loadingEl).toBeTruthy();
    });
  });

  describe('Idle State and Min Character Validation (4)', () => {
    it('should keep idle state and show hint when query < 3 characters and no filters are set (AC-8)', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('ab');
      component.onQueryChange();
      tick(500);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();
      expect(component.status()).toBe('idle');

      const idleEl = fixture.debugElement.query(By.css('[data-test="cgspace-idle"]'));
      expect(idleEl).toBeTruthy();
      expect(idleEl.nativeElement.textContent).toContain('Please enter at least 3 characters to search the selected repositories.');
    }));

    it('should search with < 3 characters if a Type filter is selected (AC-14)', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('');
      component.onTypeSelect({ value: 'Journal Article' });
      tick(400);

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith({
        type: 'Journal Article',
        page: 0,
        size: 10,
        year: 2026,
        repository: 'cgspace,melspace,worldfish'
      });
    }));
  });

  describe('Empty State (5)', () => {
    it('should render exact empty state copy string when search returns 0 items', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: { items: [], page: { totalElements: 0 } },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('unknownterm');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(component.status()).toBe('empty');
      const emptyEl = fixture.debugElement.query(By.css('[data-test="cgspace-empty"]'));
      expect(emptyEl).toBeTruthy();
      expect(emptyEl.nativeElement.textContent).toContain(
        'No items found in the selected repositories for this search. Try different terms or use Manual entry.'
      );
    }));
  });

  describe('Error State and Fail-soft Fallback (6)', () => {
    it('should render exact error state copy string and emit switchToManual on link click (R-10, AC-7)', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        throwError(() => new Error('CGSpace 502 Service Unavailable'))
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      const switchManualSpy = jest.fn();
      component.switchToManual.subscribe(switchManualSpy);

      component.query.set('maize');
      component.runSearch(0);
      tick(0); // drain timer(0) → retry 2
      tick(0); // drain timer(0) → retry 3 (exhausted → error)
      fixture.detectChanges();

      expect(component.status()).toBe('error');
      const errorEl = fixture.debugElement.query(By.css('[data-test="cgspace-error"]'));
      expect(errorEl).toBeTruthy();
      expect(errorEl.nativeElement.textContent).toContain('Repository search is temporarily unavailable');
      // KPM-R-7 / KPM-AC-8: error copy names every selected repository — never CGSpace-only.
      expect(errorEl.nativeElement.textContent).toContain('CGSpace');
      expect(errorEl.nativeElement.textContent).toContain('MELSpace');
      expect(errorEl.nativeElement.textContent).toContain('WorldFish');
      expect(errorEl.nativeElement.textContent).toContain('did not respond — use Manual entry.');

      const manualBtn = fixture.debugElement.query(By.css('[data-test="switch-to-manual-error"]'));
      expect(manualBtn).toBeTruthy();
      manualBtn.nativeElement.click();
      expect(switchManualSpy).toHaveBeenCalledTimes(1);
    }));

    it('should retry search when Try again button is clicked in error state', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        throwError(() => new Error('CGSpace 502 Service Unavailable'))
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(component.status()).toBe('error');

      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({ response: { items: [{ uuid: 'uuid-1', title: 'Maize paper', handle: '10568/1' }], page: { totalElements: 1, number: 0, size: 10 } } })
      );

      const retryBtn = fixture.debugElement.query(By.css('[data-test="cgspace-retry-btn"]'));
      expect(retryBtn).toBeTruthy();
      retryBtn.nativeElement.click();
      tick();
      fixture.detectChanges();

      expect(component.status()).toBe('results');
      expect(component.items().length).toBe(1);
    }));
  });

  describe('Year Filter: Non-admin vs Admin (7 & 8)', () => {
    it('should lock Year to phaseYear for non-admin, render locked chip with aria-disabled="true", and always send year in search (R-12, AC-12)', fakeAsync(() => {
      fixture.componentRef.setInput('isAdmin', false);
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      const lockedChip = fixture.debugElement.query(By.css('[aria-disabled="true"]'));
      expect(lockedChip).toBeTruthy();
      expect(lockedChip.nativeElement.textContent).toContain('Year: 2026');
      expect(lockedChip.nativeElement.textContent).toContain('(reporting cycle)');

      component.query.set('beans');
      component.runSearch(0);
      tick();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2026 })
      );
    }));

    it('should allow admin to change or clear year (R-12, AC-12)', fakeAsync(() => {
      fixture.componentRef.setInput('isAdmin', true);
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      // Check admin year options: 2026 down to 2016 (11 years)
      const options = component.adminYearOptions();
      expect(options.length).toBe(11);
      expect(options[0].value).toBe(2026);
      expect(options[10].value).toBe(2016);

      // Select year 2024
      component.query.set('wheat');
      component.onYearSelect({ value: 2024 });
      component.runSearch(0);
      tick();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2024 })
      );

      // Clear year (null)
      component.onYearSelect(null);
      component.runSearch(0);
      tick();

      const lastCall = mockResultsApiService.GET_cgspaceSearch.mock.calls.slice(-1)[0][0];
      expect(lastCall.year).toBeUndefined();
    }));
  });

  describe('Card Rendering, Authors Format, Country Chips & Monospace Handle (9)', () => {
    it('should render results card with correct meta line, up to 3 country chips, and monospace handle (R-4)', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1, sampleItemSingleAuthor],
            page: { totalElements: 2 }
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('climate');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(component.status()).toBe('results');

      // Counter text — no sources[] in this fixture, so no per-repository breakdown (KPM-R-4).
      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Showing 2 of 2 items');

      // Multi-author format: "firstAuthor et al."
      expect(content).toContain('Smith, John et al.');

      // Single-author format: exact author
      expect(content).toContain('Solo Author');

      // Country chips: sampleItem1 has 4 countries, only first 3 should be displayed in the card chips
      expect(content).toContain('Kenya');
      expect(content).toContain('Colombia');
      expect(content).toContain('Ethiopia');

      // Monospace handle
      const handles = fixture.debugElement.queryAll(By.css('.font-mono'));
      expect(handles.length).toBe(2);
      expect(handles[0].nativeElement.textContent).toContain('10568/128401');
      expect(handles[1].nativeElement.textContent).toContain('10568/99999');
    }));
  });

  describe('Use this item Action & Busy State (10 & 11)', () => {
    it('should emit itemSelected with full CgspaceItemDto when clicking Use this item', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1],
            page: { totalElements: 1 }
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      const itemSelectedSpy = jest.fn();
      component.itemSelected.subscribe(itemSelectedSpy);

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      const useBtn = fixture.debugElement.query(By.css('button[aria-label="Use this item: Maize productivity and climate adaptation in Africa"]'));
      expect(useBtn).toBeTruthy();
      useBtn.nativeElement.click();

      expect(itemSelectedSpy).toHaveBeenCalledWith(sampleItem1);
    }));

    it('should disable Use this item button when busy input is true', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1],
            page: { totalElements: 1 }
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      const useBtn = fixture.debugElement.query(By.css('button[aria-label="Use this item: Maize productivity and climate adaptation in Africa"]'));
      expect(useBtn.nativeElement.disabled).toBe(true);

      fixture.componentRef.setInput('busy', false);
      fixture.detectChanges();
      expect(useBtn.nativeElement.disabled).toBe(false);
    }));

    it('skips the local busy overlay when showBusyOverlay is false (parent drawer owns it)', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1],
            page: { totalElements: 1 }
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.componentRef.setInput('showBusyOverlay', false);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      const useBtn = fixture.debugElement.query(By.css('button[aria-label="Use this item: Maize productivity and climate adaptation in Africa"]'));
      useBtn.nativeElement.click();
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-test="cgspace-retrieving"]')).toBeNull();
      expect(useBtn.nativeElement.disabled).toBe(true);
    }));

    it('shows a retrieving overlay on the results list while busy after Use this item', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1],
            page: { totalElements: 1 }
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-test="cgspace-retrieving"]')).toBeNull();

      const useBtn = fixture.debugElement.query(By.css('button[aria-label="Use this item: Maize productivity and climate adaptation in Africa"]'));
      useBtn.nativeElement.click();
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('[data-test="cgspace-retrieving"]');
      expect(overlay).toBeTruthy();
      // @akili-spec changes/kp-multi-repository-browse — KPM-T-7: label is the item's own repository, not a hardcoded string.
      expect(overlay.textContent).toContain('Retrieving metadata from CGSpace…');
      expect(useBtn.nativeElement.textContent).toContain('Retrieving');
    }));

    it('KPM-T-7: the overlay names the repository of the item being retrieved, not a hardcoded one', fakeAsync(() => {
      const melspaceItem: CgspaceItemDto = {
        ...sampleItemSingleAuthor,
        uuid: 'melspace-uuid',
        handle: '20.500.11766/1',
        itemUrl: 'https://repo.mel.cgiar.org/items/melspace-uuid',
        repository: 'melspace'
      };
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({ response: { items: [melspaceItem], page: { totalElements: 1 } }, status: 200 })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      const useBtn = fixture.debugElement.query(By.css('button[aria-label="Use this item: Single Author Study"]'));
      useBtn.nativeElement.click();
      fixture.componentRef.setInput('busy', true);
      fixture.detectChanges();

      const overlay = fixture.nativeElement.querySelector('[data-test="cgspace-retrieving"]');
      expect(overlay.textContent).toContain('Retrieving metadata from MELSpace…');
    }));
  });

  describe('View details and Host Validation (12)', () => {
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open itemUrl in new tab with noopener,noreferrer for allowed hosts (cgspace.cgiar.org, hdl.handle.net)', () => {
      // cgspace host
      component.openItemDetails(sampleItem1);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://cgspace.cgiar.org/items/11111111-2222-3333-4444-555555555555',
        '_blank',
        'noopener,noreferrer'
      );

      // handle host
      windowOpenSpy.mockClear();
      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://hdl.handle.net/10568/128401' });
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://hdl.handle.net/10568/128401',
        '_blank',
        'noopener,noreferrer'
      );

      // doi host
      windowOpenSpy.mockClear();
      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://hdl.handle.net/10568/128401' });
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://hdl.handle.net/10568/128401',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should reject untrusted or malicious hosts without calling window.open', () => {
      windowOpenSpy.mockClear();
      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://malicious-site.com/fake-cgspace' });
      expect(windowOpenSpy).not.toHaveBeenCalled();

      component.openItemDetails({ ...sampleItem1, itemUrl: 'not-a-url' });
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });

  describe('Load More Pagination (13)', () => {
    it('should show Load more button iff page.hasMore and append next page results (KPM-R-20)', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch
        .mockReturnValueOnce(
          of({
            response: {
              items: [sampleItem1],
              page: { totalElements: 2, hasMore: true }
            },
            status: 200
          })
        )
        .mockReturnValueOnce(
          of({
            response: {
              items: [sampleItemSingleAuthor],
              page: { totalElements: 2, hasMore: false }
            },
            status: 200
          })
        );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(component.items().length).toBe(1);
      expect(component.total()).toBe(2);

      // Load more button should be visible
      const loadMoreBtn = fixture.debugElement.query(By.css('button:not([disabled])'));
      expect(fixture.nativeElement.textContent).toContain('Load more');

      component.loadMore();
      tick();
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
      expect(component.items().length).toBe(2);
      expect(component.items()[0].handle).toBe('10568/128401');
      expect(component.items()[1].handle).toBe('10568/99999');
      // page.hasMore:false on the second page → the button is gone (KPM-R-20).
      expect(fixture.nativeElement.textContent).not.toContain('Load more');
    }));

    it('KPM-R-20: hasMore:false on the first response hides Load more entirely', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: { items: [sampleItem1], page: { totalElements: 1, hasMore: false } },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick();
      fixture.detectChanges();

      expect(component.status()).toBe('results');
      expect(fixture.nativeElement.textContent).not.toContain('Load more');
    }));
  });

  // ─── KCSR-T-1: Retry failed CGSpace searches ────────────────────────────────
  describe('Search Retry (KCSR-T-1)', () => {
    const successResponse = (items: unknown[] = [{ handle: '10568/1' }]) => ({
      response: { items, page: { totalElements: items.length, number: 0, size: 10 } }
    });
    const alwaysFail = () => throwError(() => new Error('CGSpace timeout'));

    it('KCSR-TEST-1: recovers on second attempt (fail → succeed)', fakeAsync(() => {
      let calls = 0;
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => {
        calls++;
        if (calls === 1) return throwError(() => new Error('CGSpace timeout'));
        return of(successResponse());
      });

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('rice');
      component.runSearch(0);
      tick(0); // drain timer(0) → retry attempt 2 (succeeds)
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(2);
      expect(component.status()).toBe('results');
      expect(component.items().length).toBe(1);
    }));

    it('KCSR-TEST-2: shows error only after all 3 attempts exhaust', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => alwaysFail());

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('wheat');
      component.runSearch(0);
      tick(0); // drain timer(0) → retry attempt 2
      tick(0); // drain timer(0) → retry attempt 3 (all exhausted → error)
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(3);
      expect(component.status()).toBe('error');
    }));

    it('KCSR-TEST-3: empty 200 response does NOT trigger retry', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() =>
        of({ response: { statusCode: 200, status: 200, result: { items: [], numFound: 0 } } })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      flush();
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
      expect(component.status()).toBe('empty');
      expect(component.items().length).toBe(0);
    }));

    it('KCSR-TEST-4: loading state is maintained throughout all retry attempts (no error flash)', fakeAsync(() => {
      component.retryDelayMs = 50;
      const statuses: string[] = [];
      let calls = 0;
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => {
        calls++;
        if (calls < 3) return throwError(() => new Error('CGSpace timeout'));
        return of(successResponse());
      });

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('bean');
      component.runSearch(0);

      // After first failure, delay ticking — status must NOT be 'error'
      tick(0);
      fixture.detectChanges();
      statuses.push(component.status());

      tick(50); // allow retry 2
      tick(0);
      fixture.detectChanges();
      statuses.push(component.status());

      tick(50); // allow retry 3 (succeeds)
      fixture.detectChanges();
      statuses.push(component.status());

      // All intermediate states must be loading/loadingMore, never 'error'
      expect(statuses.slice(0, 2).every(s => s === 'loading' || s === 'loadingMore')).toBe(true);
      // Final state is results
      expect(component.status()).toBe('results');
    }));

    it('KCSR-TEST-5: new query cancels leftover retries', fakeAsync(() => {
      component.retryDelayMs = 200;
      let firstQueryCalls = 0;
      mockResultsApiService.GET_cgspaceSearch = jest.fn(params => {
        if ((params as { query: string }).query === 'old') {
          firstQueryCalls++;
          return throwError(() => new Error('timeout'));
        }
        return of(successResponse([{ handle: '10568/new' }]));
      });

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('old');
      component.runSearch(0);
      tick(0); // first attempt fires, fails

      // Before retry fires, issue new query
      component.query.set('new');
      component.runSearch(0);
      flush();
      fixture.detectChanges();

      // Old query should not have retried after cancellation
      expect(firstQueryCalls).toBe(1);
      expect(component.status()).toBe('results');
      expect(component.items()[0].handle).toBe('10568/new');
    }));

    it('KCSR-TEST-5b: A\'s late success does not paint B — switchMap discard is observable', fakeAsync(() => {
      // Non-zero delay so B can be fired while A's retry is still pending (200ms window)
      component.retryDelayMs = 200;
      let oldQueryCalls = 0;

      mockResultsApiService.GET_cgspaceSearch = jest.fn(params => {
        if ((params as { query: string }).query === 'old') {
          oldQueryCalls++;
          if (oldQueryCalls === 1) {
            // Attempt 1 for A fails → retry scheduled after 200ms
            return throwError(() => new Error('CGSpace timeout'));
          }
          // Attempt 2 for A (retry) WOULD succeed with a distinguishable handle —
          // but switchMap must cancel it before it fires.
          return of(successResponse([{ handle: '10568/old' }]));
        }
        // Query B: always succeeds immediately
        return of(successResponse([{ handle: '10568/new' }]));
      });

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      // Start A — fires immediately (runSearch → immediate:true)
      component.query.set('old');
      component.runSearch(0);
      // A's first attempt fires and fails; the retry timer (200ms) is now armed
      tick(0);

      // Start B BEFORE the 200ms retry fires:
      // the outer switchMap unsubscribes from A's inner sequence, cancelling the 200ms timer.
      component.query.set('new');
      component.runSearch(0);
      // drain all remaining timers — A's 200ms retry must NOT have fired
      flush();
      fixture.detectChanges();

      // B painted:
      expect(component.items()[0].handle).toBe('10568/new');
      // A's late success was discarded (never applied to items):
      expect(component.items().every((i: CgspaceItemDto) => i.handle !== '10568/old')).toBe(true);
      // A's retry never ran — the switchMap cancellation is confirmed by call count:
      expect(oldQueryCalls).toBe(1);
      expect(component.status()).toBe('results');
      // Last API call used B's query params — further proof A was abandoned:
      const lastCallParams = mockResultsApiService.GET_cgspaceSearch.mock.calls.slice(-1)[0][0];
      expect((lastCallParams as { query: string }).query).toBe('new');
    }));

    it('KCSR-TEST-6: manual "Try again" starts a fresh retry cycle', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => alwaysFail());

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('sorghum');
      component.runSearch(0);
      tick(0); // drain timer(0) → retry 2
      tick(0); // drain timer(0) → retry 3 (exhausted → error)
      fixture.detectChanges();

      // First cycle exhausted: 3 calls, error state
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(3);
      expect(component.status()).toBe('error');

      // User clicks "Try again" → new full retry cycle
      const retryBtn = fixture.debugElement.query(By.css('[data-test="cgspace-retry-btn"]'));
      expect(retryBtn).toBeTruthy();
      retryBtn.nativeElement.click();
      tick(0); // drain timer(0) → retry 2
      tick(0); // drain timer(0) → retry 3 (exhausted → error)
      fixture.detectChanges();

      // 3 more attempts (total 6) — still error (always fails)
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(6);
      expect(component.status()).toBe('error');
    }));

    it('KCSR-TEST-7: HTTP 200 body with status:502 counts as failure', fakeAsync(() => {
      let calls = 0;
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => {
        calls++;
        if (calls < 3) {
          // HTTP 200 wrapper but body signals gateway error (KCSR-R-1)
          return of({ response: { status: 502, items: [], page: { totalElements: 0 } } });
        }
        return of(successResponse());
      });

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('cassava');
      component.runSearch(0);
      tick(0); // drain timer(0) → retry 2 (still 502 body)
      tick(0); // drain timer(0) → retry 3 (succeeds)
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(3);
      expect(component.status()).toBe('results');
      expect(component.items().length).toBe(1);
    }));

    it('KCSR-TEST-8: facet calls are unaffected by search retries', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch = jest.fn(() => alwaysFail());

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      // Record facet call count after init
      const facetCallsAfterInit = mockResultsApiService.GET_cgspaceFacet.mock.calls.length;

      component.query.set('teff');
      component.runSearch(0);
      flush();
      fixture.detectChanges();

      // Facet call count must not change during search retries
      expect(mockResultsApiService.GET_cgspaceFacet.mock.calls.length).toBe(facetCallsAfterInit);
    }));
  });

  describe('Facet Resilience and Fallbacks', () => {
    it('should fall back to standard types and centers if facet API calls fail or return empty', () => {
      mockResultsApiService.GET_cgspaceFacet.mockReturnValue(throwError(() => new Error('CGSpace timeout')));

      const testFixture = TestBed.createComponent(KpCgspaceBrowseComponent);
      const testComp = testFixture.componentInstance;
      testFixture.componentRef.setInput('phaseYear', 2026);
      testFixture.detectChanges();

      expect(testComp.typeOptions().length).toBeGreaterThan(0);
      expect(testComp.centerOptions().length).toBeGreaterThan(0);
      expect(testComp.typeOptions().some(t => t.label === 'Journal Article')).toBe(true);
      expect(testComp.centerOptions().some(c => c.label.includes('Alliance'))).toBe(true);
    });

    it('should format center options with acronym - name pattern', () => {
      const ciatOption = component.centerOptions().find(c => c.value === 'International Center for Tropical Agriculture');
      expect(ciatOption?.label).toBe('CIAT - International Center for Tropical Agriculture');

      const allianceOption = component.centerOptions().find(c => c.value.includes('Alliance'));
      expect(allianceOption?.label).toMatch(/^Alliance - /);
    });

    it('should render spinner icon when loading facets', () => {
      mockResultsApiService.GET_cgspaceFacet.mockReturnValue(new Subject());
      const testFixture = TestBed.createComponent(KpCgspaceBrowseComponent);
      testFixture.detectChanges();

      const centerSpinner = testFixture.nativeElement.querySelector('.kp-filter-center .pi-spinner');
      expect(centerSpinner).toBeTruthy();

      const typeSpinner = testFixture.nativeElement.querySelector('.kp-filter-type .pi-spinner');
      expect(typeSpinner).toBeTruthy();
    });
  });
  // ─── KPM-T-6: repository source strip and selection rules ───────────────────
  describe('Repository source strip (KPM-T-6)', () => {
    const sourceOk = (repository: string, total: number) => ({ repository, status: 'ok', total, hasMore: false });

    const searchResponse = (items: unknown[], sources: unknown[]) => ({
      response: {
        items,
        page: { number: 0, size: 10, totalElements: items.length, totalPages: 1, hasMore: false },
        sources
      },
      message: 'Repository search results',
      status: 200
    });

    const chips = (f: ComponentFixture<KpCgspaceBrowseComponent> = fixture): HTMLButtonElement[] =>
      Array.from(f.nativeElement.querySelectorAll('[data-test^="kp-repo-chip-"]')) as HTMLButtonElement[];

    const chipFor = (key: string, f: ComponentFixture<KpCgspaceBrowseComponent> = fixture): HTMLButtonElement =>
      f.nativeElement.querySelector(`[data-test="kp-repo-chip-${key}"]`) as HTMLButtonElement;

    const selectAllBtn = (): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector('[data-test="kp-select-all-repos"]');

    const lastSearchParams = () => mockResultsApiService.GET_cgspaceSearch.mock.calls.slice(-1)[0][0];

    beforeEach(() => {
      mockResultsApiService.GET_cgspaceSearch.mockImplementation(() =>
        of(searchResponse([sampleItem1], [sourceOk('cgspace', 18), sourceOk('melspace', 6), sourceOk('worldfish', 3)]))
      );
    });

    it('KPM-AC-1: renders the lead-in and three pressed chips on open, with no search request', () => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      const strip = fixture.nativeElement.querySelector('[data-test="kp-source-strip"]') as HTMLElement;
      expect(strip).toBeTruthy();
      expect(strip.getAttribute('role')).toBe('group');
      expect(strip.getAttribute('aria-label')).toBe('Repositories to search');
      expect(strip.textContent).toContain('Searching 3 CGIAR knowledge repositories');

      const rendered = chips();
      expect(rendered.length).toBe(3);
      expect(rendered.map(c => c.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
      expect(rendered.map(c => c.textContent?.trim().split(/\s+/)[0])).toEqual(['CGSpace', 'MELSpace', 'WorldFish']);
      expect(rendered.every(c => c.getAttribute('aria-disabled') === null)).toBe(true);
      expect(selectAllBtn()).toBeNull();

      expect(component.selectedRepositories()).toEqual(['cgspace', 'melspace', 'worldfish']);
      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();
    });

    it('KPM-AC-2: deselecting MELSpace re-runs the search once with repository=cgspace,worldfish', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();
      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(1);
      expect(lastSearchParams().repository).toBe('cgspace,melspace,worldfish');

      chipFor('melspace').click();
      tick(400);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).toHaveBeenCalledTimes(2);
      expect(lastSearchParams()).toEqual(
        expect.objectContaining({ query: 'maize', page: 0, size: 10, year: 2026, repository: 'cgspace,worldfish' })
      );
      expect(chipFor('melspace').getAttribute('aria-pressed')).toBe('false');
      expect(chipFor('cgspace').getAttribute('aria-pressed')).toBe('true');
      expect(selectAllBtn()).toBeTruthy();
      flush();
    }));

    it('KPM-AC-3: the last selected chip is aria-disabled with a reason and clicking it sends no request', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      chipFor('melspace').click();
      tick(400);
      chipFor('worldfish').click();
      tick(400);
      fixture.detectChanges();

      const callsBefore = mockResultsApiService.GET_cgspaceSearch.mock.calls.length;
      expect(component.selectedRepositories()).toEqual(['cgspace']);

      const last = chipFor('cgspace');
      expect(last.getAttribute('aria-disabled')).toBe('true');
      expect(last.getAttribute('title')).toBe(KP_LAST_REPOSITORY_TITLE);
      expect((last.getAttribute('title') || '').length).toBeGreaterThan(0);

      last.click();
      tick(500);
      fixture.detectChanges();

      expect(component.selectedRepositories()).toEqual(['cgspace']);
      expect(chipFor('cgspace').getAttribute('aria-pressed')).toBe('true');
      expect(mockResultsApiService.GET_cgspaceSearch.mock.calls.length).toBe(callsBefore);
      flush();
    }));

    it('KPM-R-2: Select all appears below three and restores the three chips with exactly one request', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      chipFor('worldfish').click();
      tick(400);
      fixture.detectChanges();

      const restore = selectAllBtn();
      expect(restore).toBeTruthy();

      const callsBefore = mockResultsApiService.GET_cgspaceSearch.mock.calls.length;
      restore!.click();
      tick(400);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch.mock.calls.length).toBe(callsBefore + 1);
      expect(lastSearchParams().repository).toBe('cgspace,melspace,worldfish');
      expect(chips().map(c => c.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
      expect(selectAllBtn()).toBeNull();
      flush();
    }));

    it('KPM-R-2: with nothing searchable a chip toggle only updates the strip', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('ab');
      component.onQueryChange();
      tick(500);
      fixture.detectChanges();
      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();

      chipFor('worldfish').click();
      tick(500);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();
      expect(component.status()).toBe('idle');
      expect(chipFor('worldfish').getAttribute('aria-pressed')).toBe('false');
      expect(selectAllBtn()).toBeTruthy();
      flush();
    }));

    it('KPM-R-9: facet loads carry the repository selection and re-run when it changes', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceFacet).toHaveBeenCalledWith('itemtype', undefined, undefined, [
        'cgspace',
        'melspace',
        'worldfish'
      ]);

      mockResultsApiService.GET_cgspaceFacet.mockClear();
      chipFor('melspace').click();
      tick(400);
      fixture.detectChanges();

      expect(mockResultsApiService.GET_cgspaceFacet).toHaveBeenCalledWith('itemtype', undefined, undefined, ['cgspace', 'worldfish']);
      expect(mockResultsApiService.GET_cgspaceFacet).toHaveBeenCalledWith('affiliation', undefined, undefined, ['cgspace', 'worldfish']);
      flush();
    }));

    it('KPM-R-6: chips show each source total, and a failed source reads "unavailable" with a state tooltip', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockImplementation(() =>
        of(
          searchResponse(
            [sampleItem1],
            [sourceOk('cgspace', 18), sourceOk('melspace', 6), { repository: 'worldfish', status: 'timeout', total: 0, hasMore: false }]
          )
        )
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      expect(component.sources().length).toBe(3);
      expect(chipFor('cgspace').textContent).toContain('18');
      expect(chipFor('melspace').textContent).toContain('6');

      const worldfish = chipFor('worldfish');
      expect(worldfish.textContent).toContain('unavailable');
      expect(worldfish.textContent).not.toContain('0');
      expect(worldfish.getAttribute('title')).toContain('WorldFish');
      expect(worldfish.getAttribute('title')).toContain('did not respond');
      // KPM-R-6: an unavailable repository stays toggleable.
      expect(worldfish.getAttribute('aria-pressed')).toBe('true');
      expect(worldfish.getAttribute('aria-disabled')).toBeNull();
      flush();
    }));

    it('KPM-R-21: a fresh panel (drawer closed and reopened) starts with the three repositories selected', fakeAsync(() => {
      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      chipFor('melspace').click();
      tick(400);
      fixture.detectChanges();
      expect(component.selectedRepositories()).toEqual(['cgspace', 'worldfish']);
      flush();

      // The drawer body is rendered under @if in app-pr-dialog: closing destroys this panel.
      fixture.destroy();

      const reopened = TestBed.createComponent(KpCgspaceBrowseComponent);
      reopened.componentRef.setInput('phaseYear', 2026);
      reopened.detectChanges();

      expect(reopened.componentInstance.selectedRepositories()).toEqual(['cgspace', 'melspace', 'worldfish']);
      expect(chips(reopened).map(c => c.getAttribute('aria-pressed'))).toEqual(['true', 'true', 'true']);
      expect(chipFor('cgspace', reopened).getAttribute('aria-disabled')).toBeNull();
      reopened.destroy();
      flush();
    }));
  });

  // ─── KPM-T-7: badges, "Also in", counter, partial notice + retry, error copy, allow-list, Load more ───
  describe('Badges, notice, retry, allow-list (KPM-T-7)', () => {
    const sourceOk = (repository: string, total: number) => ({ repository, status: 'ok', total, hasMore: false });
    const sourceFailed = (repository: string, status: 'timeout' | 'error' | 'unconfigured' = 'timeout') => ({
      repository,
      status,
      total: 0,
      hasMore: false
    });

    it('KPM-R-7 / KPM-AC-7: mixed response (2 ok + 1 timeout) renders items, WorldFish "unavailable", one Retry, and re-sends identical params without leaving "results"', fakeAsync(() => {
      const cgspaceItem = { ...sampleItem1, repository: 'cgspace' as const };
      const melspaceItem = { ...sampleItemSingleAuthor, repository: 'melspace' as const };

      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [cgspaceItem, melspaceItem],
            page: { number: 0, size: 10, totalElements: 24, totalPages: 3, hasMore: true },
            sources: [sourceOk('cgspace', 18), sourceOk('melspace', 6), sourceFailed('worldfish', 'timeout')]
          },
          message: 'Repository search results',
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      // Items rendered
      expect(component.status()).toBe('results');
      expect(component.items().length).toBe(2);

      // KPM-R-4: every rendered card carries a badge whose text equals its item's repository label
      const cgspaceBadge = fixture.nativeElement.querySelector('[data-test="kp-item-badge-cgspace"]');
      expect(cgspaceBadge).toBeTruthy();
      expect(cgspaceBadge.textContent).toContain('CGSpace');

      const melspaceBadge = fixture.nativeElement.querySelector('[data-test="kp-item-badge-melspace"]');
      expect(melspaceBadge).toBeTruthy();
      expect(melspaceBadge.textContent).toContain('MELSpace');

      // WorldFish chip reads "unavailable"
      const worldfishChip = fixture.nativeElement.querySelector('[data-test="kp-repo-chip-worldfish"]');
      expect(worldfishChip.textContent).toContain('unavailable');

      // Notice names WorldFish and carries exactly one retry button
      const notice = fixture.nativeElement.querySelector('[data-test="kp-partial-notice"]');
      expect(notice).toBeTruthy();
      expect(notice.getAttribute('role')).toBe('status');
      expect(notice.textContent).toContain('WorldFish');
      const retryButtons = notice.querySelectorAll('button[data-test^="kp-retry-"]');
      expect(retryButtons.length).toBe(1);
      expect(retryButtons[0].getAttribute('data-test')).toBe('kp-retry-worldfish');
      expect(retryButtons[0].textContent).toContain('Retry WorldFish');

      const callsBefore = mockResultsApiService.GET_cgspaceSearch.mock.calls.length;
      const paramsBefore = mockResultsApiService.GET_cgspaceSearch.mock.calls.slice(-1)[0][0];

      (retryButtons[0] as HTMLButtonElement).click();
      tick(400);
      fixture.detectChanges();

      // Retry sends exactly one more request with identical params (full selection, page 0)
      expect(mockResultsApiService.GET_cgspaceSearch.mock.calls.length).toBe(callsBefore + 1);
      expect(mockResultsApiService.GET_cgspaceSearch.mock.calls.slice(-1)[0][0]).toEqual(paramsBefore);
      expect(component.status()).toBe('results');
      flush();
    }));

    it('KPM-R-7: no notice renders when all 3 selected repositories answer ok', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [sampleItem1],
            page: { number: 0, size: 10, totalElements: 18, totalPages: 1, hasMore: false },
            sources: [sourceOk('cgspace', 12), sourceOk('melspace', 4), sourceOk('worldfish', 2)]
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      expect(component.failedSources().length).toBe(0);
      expect(fixture.nativeElement.querySelector('[data-test="kp-partial-notice"]')).toBeNull();
    }));

    it('KPM-R-4: counter equals "Showing 2 of 24 items · CGSpace 18 · MELSpace 6" for the mixed fixture', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [{ ...sampleItem1, repository: 'cgspace' as const }, { ...sampleItemSingleAuthor, repository: 'melspace' as const }],
            page: { number: 0, size: 10, totalElements: 24, totalPages: 3, hasMore: true },
            sources: [sourceOk('cgspace', 18), sourceOk('melspace', 6), sourceFailed('worldfish', 'timeout')]
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      const counter = fixture.nativeElement.querySelector('[data-test="kp-results-counter"]');
      expect(counter.textContent.trim()).toBe('Showing 2 of 24 items · CGSpace 18 · MELSpace 6');
    }));

    it('KPM-R-7 / KPM-AC-8: 502 wrapper enters error state with copy naming the three selected repositories and the Manual entry link', fakeAsync(() => {
      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        throwError(() => new Error('Repository proxy 502 Service Unavailable'))
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      component.query.set('maize');
      component.runSearch(0);
      tick(0);
      tick(0);
      fixture.detectChanges();

      expect(component.status()).toBe('error');
      const errorCopy = fixture.nativeElement.querySelector('[data-test="cgspace-error-copy"]');
      expect(errorCopy.textContent).toContain('CGSpace');
      expect(errorCopy.textContent).toContain('MELSpace');
      expect(errorCopy.textContent).toContain('WorldFish');

      const manualBtn = fixture.debugElement.query(By.css('[data-test="switch-to-manual-error"]'));
      expect(manualBtn).toBeTruthy();
    }));

    it('KPM-R-5: a deduplicated item renders one card with "Also in MELSpace" and the secondary handle, and Use this item emits the primary itemUrl', fakeAsync(() => {
      const mergedItem: CgspaceItemDto = {
        ...sampleItem1,
        repository: 'cgspace',
        alsoIn: [
          {
            repository: 'melspace',
            handle: '20.500.11766/54321',
            handleUrl: 'https://hdl.handle.net/20.500.11766/54321',
            itemUrl: 'https://repo.mel.cgiar.org/items/22222222-3333-4444-5555-666666666666'
          }
        ]
      };

      mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
        of({
          response: {
            items: [mergedItem],
            page: { number: 0, size: 10, totalElements: 1, totalPages: 1, hasMore: false },
            sources: [sourceOk('cgspace', 1), sourceOk('melspace', 1), sourceOk('worldfish', 0)]
          },
          status: 200
        })
      );

      fixture.componentRef.setInput('phaseYear', 2026);
      fixture.detectChanges();

      const itemSelectedSpy = jest.fn();
      component.itemSelected.subscribe(itemSelectedSpy);

      component.query.set('maize');
      component.onQueryChange();
      tick(400);
      fixture.detectChanges();

      // One card only
      expect(component.items().length).toBe(1);

      // KPM-R-4 / KPM-R-5: the CGSpace badge (name + text, not color alone) is present
      const badge = fixture.nativeElement.querySelector('[data-test="kp-item-badge-cgspace"]');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('CGSpace');

      const alsoIn = fixture.nativeElement.querySelector('[data-test="kp-also-in-melspace"]');
      expect(alsoIn).toBeTruthy();
      expect(alsoIn.textContent).toContain('Also in MELSpace');

      const secondaryHandle = fixture.nativeElement.querySelector('[data-test="kp-also-in-handle-melspace"]');
      expect(secondaryHandle).toBeTruthy();
      expect(secondaryHandle.textContent).toContain('20.500.11766/54321');

      const useBtn = fixture.debugElement.query(By.css(`button[aria-label="Use this item: ${mergedItem.title}"]`));
      useBtn.nativeElement.click();

      expect(itemSelectedSpy).toHaveBeenCalledWith(expect.objectContaining({ itemUrl: mergedItem.itemUrl }));
      flush();
    }));

    it('KPM-R-15 / KPM-AC-17: View details opens all four allowed hosts and refuses an untrusted host', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://cgspace.cgiar.org/items/uuid-1' });
      expect(windowOpenSpy).toHaveBeenLastCalledWith('https://cgspace.cgiar.org/items/uuid-1', '_blank', 'noopener,noreferrer');

      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://repo.mel.cgiar.org/items/uuid-2' });
      expect(windowOpenSpy).toHaveBeenLastCalledWith('https://repo.mel.cgiar.org/items/uuid-2', '_blank', 'noopener,noreferrer');

      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://digitalarchive.worldfishcenter.org/items/uuid-3' });
      expect(windowOpenSpy).toHaveBeenLastCalledWith(
        'https://digitalarchive.worldfishcenter.org/items/uuid-3',
        '_blank',
        'noopener,noreferrer'
      );

      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://hdl.handle.net/10568/1' });
      expect(windowOpenSpy).toHaveBeenLastCalledWith('https://hdl.handle.net/10568/1', '_blank', 'noopener,noreferrer');

      windowOpenSpy.mockClear();
      component.openItemDetails({ ...sampleItem1, itemUrl: 'https://evil.example/items/x' });
      expect(windowOpenSpy).not.toHaveBeenCalled();

      windowOpenSpy.mockRestore();
    });
  });
});
