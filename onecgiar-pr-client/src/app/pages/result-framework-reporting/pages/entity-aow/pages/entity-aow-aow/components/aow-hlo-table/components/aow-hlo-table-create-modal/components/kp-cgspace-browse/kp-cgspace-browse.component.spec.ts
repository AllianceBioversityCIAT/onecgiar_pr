import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';
import { BrnTooltip } from '@spartan-ng/brain/tooltip';
import { CgspaceItemDto, KP_LAST_REPOSITORY_TITLE, KpCgspaceBrowseComponent, KpProjectMatchFactor, KpProjectMatchTier } from './kp-cgspace-browse.component';
import { ALL_KP_REPOSITORIES } from './kp-repositories.constants';
import { ResultsApiService } from 'src/app/shared/services/api/results-api.service';
import { RolesService } from 'src/app/shared/services/global/roles.service';
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

  // A non-admin user creating a result has RolesService.readOnly === true (it only drops for
  // admins or inside a result of one of their initiatives). The search filters must stay usable:
  // without [editable]="true" pr-select rendered them as plain text "Not provided".
  it('keeps the type and affiliation filters interactive for a non-admin (read-only roles) user', () => {
    TestBed.inject(RolesService).readOnly = true;
    fixture.componentRef.setInput('phaseYear', 2026);
    fixture.detectChanges();

    for (const selector of ['.kp-filter-type', '.kp-filter-center']) {
      const filter: HTMLElement = fixture.nativeElement.querySelector(selector);
      expect(filter.querySelector('.custom_select')).not.toBeNull();
      expect(filter.textContent).not.toContain('Not provided');
    }
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
      expect(emptyEl.nativeElement.textContent).toContain('No items found for this search');
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

  describe('KPAM: Science Program Accelerator Match and Badging', () => {
    const createItem = (id: string, title: string, accelerators?: string[]): CgspaceItemDto => ({
      uuid: `uuid-${id}`,
      handle: `10568/${id}`,
      handleUrl: `https://hdl.handle.net/10568/${id}`,
      itemUrl: `https://cgspace.cgiar.org/items/uuid-${id}`,
      title,
      type: 'Journal Article',
      year: 2026,
      authors: ['Author One'],
      affiliations: ['Alliance of Bioversity and CIAT'],
      countries: ['Kenya'],
      doi: null,
      uri: `https://hdl.handle.net/10568/${id}`,
      repository: 'cgspace',
      programAccelerators: accelerators
    });

    describe('Gate D2 / KPAM-AC-4: String Normalization and Matching (matchesProgram)', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();
      });

      const namingVariations = [
        { label: 'Exact program name', accelerator: 'Sustainable Farming' },
        { label: 'Prefixed code and name (SP01 - Sustainable Farming)', accelerator: 'SP01 - Sustainable Farming' },
        { label: 'Code only (SP01)', accelerator: 'SP01' },
        { label: 'Case-insensitive lowercase (sustainable farming)', accelerator: 'sustainable farming' },
        { label: 'Whitespace padded (  Sustainable Farming  )', accelerator: '  Sustainable Farming  ' },
        { label: 'Hyphenated naming (Sustainable-Farming)', accelerator: 'Sustainable-Farming' },
        { label: 'Colon separator (SP01: Sustainable Farming)', accelerator: 'SP01: Sustainable Farming' },
        { label: 'Parentheses format (Sustainable Farming (SP01))', accelerator: 'Sustainable Farming (SP01)' }
      ];

      namingVariations.forEach(({ label, accelerator }) => {
        it(`should match variation: ${label}`, () => {
          const item = createItem('test', 'Test Publication', [accelerator]);
          expect(component.matchesProgram(item)).toBe(true);
        });
      });

      it('should match if at least one accelerator in multiple entries matches', () => {
        const item = createItem('multi', 'Multi Accelerator Paper', ['Agroecology', 'SP01 - Sustainable Farming', 'Policy']);
        expect(component.matchesProgram(item)).toBe(true);
      });

      it('should return false for missing, empty, or non-matching accelerators', () => {
        expect(component.matchesProgram(createItem('none', 'No Accelerators', []))).toBe(false);
        expect(component.matchesProgram(createItem('undef', 'Undefined Accelerators', undefined))).toBe(false);
        expect(component.matchesProgram(createItem('diff', 'Different SP', ['SP02 - Climate Resilience']))).toBe(false);
        expect(component.matchesProgram(createItem('other', 'Other Tag', ['Gender Equality']))).toBe(false);
      });

      it('should return false when program inputs are empty', () => {
        fixture.componentRef.setInput('programCode', '');
        fixture.componentRef.setInput('programName', '');
        fixture.detectChanges();

        const item = createItem('test', 'Test Publication', ['Sustainable Farming']);
        expect(component.matchesProgram(item)).toBe(false);
      });
    });

    describe('Gate D3 / KPAM-AC-3 / KPAM-R-5 / KPAM-R-6: Soft-Boost Ranking and Non-Restriction', () => {
      it('should soft-boost matching items to top while preserving all items and relative order', () => {
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();

        const item1 = createItem('1', 'Non-match A', ['Agroecology']);
        const item2 = createItem('2', 'Match SP01 A', ['SP01 - Sustainable Farming']);
        const item3 = createItem('3', 'Non-match B', []);
        const item4 = createItem('4', 'Match SP01 B', ['Sustainable Farming']);
        const item5 = createItem('5', 'Non-match C', ['SP03 - Nutrition']);

        component.items.set([item1, item2, item3, item4, item5]);

        // KPAM-R-5 / Gate D3: Non-restriction - all 5 items remain present
        expect(component.displayItems().length).toBe(5);

        // KPAM-R-6 / KPAM-AC-3: Matching items appear first, preserving relative order
        expect(component.displayItems()).toEqual([item2, item4, item1, item3, item5]);
        expect(component.matchCount()).toBe(2);
      });

      it('should return raw items unchanged when matchCount is 0', () => {
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();

        const item1 = createItem('1', 'Paper 1', ['Climate']);
        const item2 = createItem('2', 'Paper 2', ['Water']);

        component.items.set([item1, item2]);
        expect(component.matchCount()).toBe(0);
        expect(component.displayItems()).toEqual([item1, item2]);
      });
    });

    describe('Gate D4 / KPAM-AC-2: UI Badging and Left Accent', () => {
      it('should render [Matches ...] badge and border accent on matching cards only', () => {
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();

        const matchingItem = createItem('1', 'Matching Paper', ['Sustainable Farming']);
        const otherItem = createItem('2', 'Other Paper', []);

        component.status.set('results');
        component.items.set([otherItem, matchingItem]);
        fixture.detectChanges();

        const cards = fixture.nativeElement.querySelectorAll('.rounded-xl.p-4.bg-white');
        expect(cards.length).toBe(2);

        // First displayed card is the soft-boosted matching item
        const firstCard = cards[0];
        expect(firstCard.classList.contains('border-l-4')).toBe(true);

        const matchBadge = firstCard.querySelector('.kp-sp-match-badge');
        expect(matchBadge).toBeTruthy();
        expect(matchBadge.textContent.trim()).toContain('Matches Sustainable Farming');
        expect(matchBadge.getAttribute('aria-label')).toBe('Matches Science Program: Sustainable Farming');
        expect(matchBadge.getAttribute('data-test')).toBe('kp-sp-match-uuid-1');

        // Second displayed card is the non-matching item
        const secondCard = cards[1];
        expect(secondCard.classList.contains('border-l-4')).toBe(false);
        expect(secondCard.querySelector('.kp-sp-match-badge')).toBeNull();
      });
    });

    describe('KPAM-AC-5 & KPAM-AC-6: Match Counter and Toggle Chip', () => {
      it('should display match count and toggle chip when matchCount > 0, and filter when toggled', () => {
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();

        const match1 = createItem('1', 'Match 1', ['Sustainable Farming']);
        const match2 = createItem('2', 'Match 2', ['SP01']);
        const other1 = createItem('3', 'Other 1', []);
        const other2 = createItem('4', 'Other 2', ['Climate']);
        const other3 = createItem('5', 'Other 3', []);

        component.status.set('results');
        component.items.set([other1, match1, other2, match2, other3]);
        component.total.set(5);
        fixture.detectChanges();

        // KPAM-AC-5: Counter displays match count and toggle chip
        const counter = fixture.nativeElement.querySelector('[data-test="kp-results-counter"]');
        expect(counter).toBeTruthy();
        expect(counter.textContent).toContain('2 match Sustainable Farming');

        const toggleBtn = fixture.nativeElement.querySelector('[data-test="kp-only-matches-toggle"]');
        expect(toggleBtn).toBeTruthy();
        expect(toggleBtn.textContent.trim()).toContain('Show matches only (2)');
        expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');

        // Verify default view shows all 5 items
        expect(component.displayItems().length).toBe(5);

        // KPAM-AC-6: Activate toggle chip
        toggleBtn.click();
        fixture.detectChanges();

        expect(component.onlyMatches()).toBe(true);
        expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
        expect(toggleBtn.textContent.trim()).toContain('Show all results');
        expect(component.displayItems().length).toBe(2);
        expect(component.displayItems()).toEqual([match1, match2]);

        // Toggle back: restores all 5 items
        toggleBtn.click();
        fixture.detectChanges();

        expect(component.onlyMatches()).toBe(false);
        expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
        expect(toggleBtn.textContent.trim()).toContain('Show matches only (2)');
        expect(component.displayItems().length).toBe(5);
      });

      it('should not show toggle chip when matchCount is 0', () => {
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.componentRef.setInput('programCode', 'SP01');
        fixture.componentRef.setInput('programName', 'Sustainable Farming');
        fixture.detectChanges();

        const item = createItem('1', 'No Match', ['Climate']);
        component.status.set('results');
        component.items.set([item]);
        component.total.set(1);
        fixture.detectChanges();

        const toggleBtn = fixture.nativeElement.querySelector('[data-test="kp-only-matches-toggle"]');
        expect(toggleBtn).toBeNull();
      });
    });
  });

  // @akili-spec changes/kp-project-strict-filter — KPSF-T-3: two-scope fetch and state
  describe('KPSF: bilateral two-scope fetch and state (KPSF-T-3)', () => {
    const PROJECT_CODE = 'T-PJ-003942';
    const PROJECT_TITLE = 'IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique';

    const createProjectItem = (id: string, title: string, projects?: string[], accelerators?: string[]): CgspaceItemDto => ({
      uuid: `uuid-${id}`,
      handle: `10568/${id}`,
      handleUrl: `https://hdl.handle.net/10568/${id}`,
      itemUrl: `https://cgspace.cgiar.org/items/uuid-${id}`,
      title,
      type: 'Report',
      year: 2026,
      authors: ['Author One'],
      affiliations: ['International Institute of Tropical Agriculture'],
      countries: ['Mozambique'],
      doi: null,
      uri: `https://hdl.handle.net/10568/${id}`,
      repository: 'cgspace',
      projects,
      programAccelerators: accelerators
    });

    const sourceOk = (repository: string, total: number) => ({ repository, status: 'ok', total, hasMore: false });

    const pageResponse = (
      items: CgspaceItemDto[],
      totalElements: number,
      hasMore: boolean,
      extra: Record<string, unknown> = {}
    ) => ({
      response: { items, page: { number: 0, size: 10, totalElements, hasMore }, ...extra },
      status: 200
    });

    const linkedItem = createProjectItem('182744', 'Strengthening bean seed systems to reach 78,000 farmers', [
      'T-PJ-003942 - IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique'
    ]);
    const relatedItems = Array.from({ length: 10 }, (_, i) => createProjectItem(`r${i}`, `Related paper ${i}`, []));

    /** Answers each request by its projectScope, like the server does. */
    const answerByScope = (linked: unknown, related: unknown) =>
      mockResultsApiService.GET_cgspaceSearch.mockImplementation((params: Record<string, unknown>) =>
        of(params['projectScope'] === 'linked' ? linked : related)
      );

    const setBilateral = (overrides: Record<string, unknown> = {}) => {
      const inputs: Record<string, unknown> = {
        enableProjectRepositoryFilter: true,
        projectCode: PROJECT_CODE,
        projectTitle: PROJECT_TITLE,
        leadCenterAcronym: 'IITA',
        phaseYear: 2026,
        ...overrides
      };
      for (const [key, value] of Object.entries(inputs)) {
        fixture.componentRef.setInput(key, value);
      }
    };

    const searchCalls = (): Record<string, any>[] => mockResultsApiService.GET_cgspaceSearch.mock.calls.map(call => call[0]);

    describe('KPSF-R-3 / KPSF-R-13: a bilateral search reset issues exactly two scoped requests', () => {
      it('opens with project context: one linked and one related request at page 0, no text or type needed', fakeAsync(() => {
        answerByScope(pageResponse([linkedItem], 1, false), pageResponse(relatedItems, 80, true));
        setBilateral();
        fixture.detectChanges();
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(2);
        expect(calls.map(c => c['projectScope']).sort()).toEqual(['linked', 'related']);
        for (const call of calls) {
          expect(call).toEqual(
            expect.objectContaining({
              page: 0,
              size: 10,
              year: 2026,
              repository: 'cgspace,melspace,worldfish',
              projectCode: PROJECT_CODE,
              projectTitle: PROJECT_TITLE,
              projectLeadCenter: 'IITA'
            })
          );
          expect(call['query']).toBeUndefined();
          expect(call['type']).toBeUndefined();
          expect(call['project']).toBeUndefined();
        }
        expect(component.query()).toBe('');
      }));

      it('both scopes carry the same query, type, center and year', fakeAsync(() => {
        answerByScope(pageResponse([linkedItem], 1, false), pageResponse(relatedItems, 80, true));
        setBilateral();
        fixture.detectChanges();
        flush();
        mockResultsApiService.GET_cgspaceSearch.mockClear();

        component.query.set('mozambique');
        component.selectedType.set('Case Study');
        component.selectedCenter.set('International Institute of Tropical Agriculture');
        component.runSearch(0);
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(2);
        const [linked, related] = ['linked', 'related'].map(scope => calls.find(c => c['projectScope'] === scope)!);
        const shared = {
          query: 'mozambique',
          type: 'Case Study',
          center: 'International Institute of Tropical Agriculture',
          year: 2026,
          page: 0
        };
        expect(linked).toEqual(expect.objectContaining(shared));
        expect(related).toEqual(expect.objectContaining(shared));
      }));

      it('a bilateral browse whose project has neither code nor title sends no project params (the server would answer 400)', fakeAsync(() => {
        setBilateral({ projectCode: '', projectTitle: '', leadCenterAcronym: '' });
        fixture.detectChanges();
        component.query.set('maize');
        component.runSearch(0);
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(Object.keys(calls[0]).filter(key => key.startsWith('project'))).toEqual([]);
      }));

      it('keeps project fields inside the server limits (code 50, title 300, lead center 20)', fakeAsync(() => {
        answerByScope(pageResponse([], 0, false), pageResponse([], 0, false));
        setBilateral({ projectCode: 'C'.repeat(80), projectTitle: 'T'.repeat(500), leadCenterAcronym: 'L'.repeat(40) });
        fixture.detectChanges();
        flush();

        const call = searchCalls()[0];
        expect(call['projectCode'].length).toBe(50);
        expect(call['projectTitle'].length).toBe(300);
        expect(call['projectLeadCenter'].length).toBe(20);
      }));
    });

    describe('KPSF-R-4: each scope keeps its own state', () => {
      it('linked and related lists, totals, hasMore and status are independent', fakeAsync(() => {
        answerByScope(
          pageResponse([linkedItem], 1, false, { projectScope: { scope: 'linked', applied: true }, sources: [sourceOk('cgspace', 1)] }),
          pageResponse(relatedItems, 80, true, { projectScope: { scope: 'related', applied: true }, sources: [sourceOk('cgspace', 80)] })
        );
        setBilateral();
        fixture.detectChanges();
        flush();

        expect(component.linkedItems()).toEqual([linkedItem]);
        expect(component.linkedTotal()).toBe(1);
        expect(component.linkedHasMore()).toBe(false);
        expect(component.linkedStatus()).toBe('results');
        expect(component.linkedApplied()).toBe(true);

        expect(component.items().length).toBe(10);
        expect(component.total()).toBe(80);
        expect(component.hasMore()).toBe(true);
        expect(component.status()).toBe('results');
        expect(component.items().some(item => item.handle === linkedItem.handle)).toBe(false);
        expect(component.linkedSources()).toEqual([sourceOk('cgspace', 1)]);
        expect(component.sources()).toEqual([sourceOk('cgspace', 80)]);
      }));

      it('section 2 Load more issues one related request and never re-queries linked', fakeAsync(() => {
        answerByScope(pageResponse([linkedItem], 1, false), pageResponse(relatedItems, 80, true));
        setBilateral();
        fixture.detectChanges();
        flush();
        mockResultsApiService.GET_cgspaceSearch.mockClear();

        component.loadMore();
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(calls[0]).toEqual(expect.objectContaining({ projectScope: 'related', page: 1 }));
        expect(component.items().length).toBe(20);
        expect(component.linkedItems()).toEqual([linkedItem]);
        expect(component.linkedPage()).toBe(0);
      }));

      it('section 1 Load more issues one linked request and never re-queries related', fakeAsync(() => {
        answerByScope(pageResponse([linkedItem], 12, true), pageResponse(relatedItems, 80, true));
        setBilateral();
        fixture.detectChanges();
        flush();
        mockResultsApiService.GET_cgspaceSearch.mockClear();

        component.loadMoreLinked();
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(calls[0]).toEqual(expect.objectContaining({ projectScope: 'linked', page: 1 }));
        expect(component.linkedItems().length).toBe(2);
        expect(component.items().length).toBe(10);
        expect(component.page()).toBe(0);
      }));

      it('applied=false on the linked response leaves linked empty and related untouched (KPSF-R-9 client half)', fakeAsync(() => {
        answerByScope(
          pageResponse([], 0, false, { projectScope: { scope: 'linked', applied: false } }),
          pageResponse(relatedItems, 80, true, { projectScope: { scope: 'related', applied: false } })
        );
        setBilateral();
        fixture.detectChanges();
        flush();

        expect(component.linkedApplied()).toBe(false);
        expect(component.linkedStatus()).toBe('empty');
        expect(component.linkedItems()).toEqual([]);
        expect(component.status()).toBe('results');
        expect(component.items().length).toBe(10);
      }));

      it('a failed linked request errors only the linked scope; related still renders', fakeAsync(() => {
        mockResultsApiService.GET_cgspaceSearch.mockImplementation((params: Record<string, unknown>) =>
          params['projectScope'] === 'linked'
            ? throwError(() => new Error('CGSpace timeout'))
            : of(pageResponse(relatedItems, 80, true))
        );
        setBilateral();
        fixture.detectChanges();
        tick(0); // retry 2 (RxJS timers are intervals: flush() does not drain them)
        tick(0); // retry 3 exhausted -> error

        expect(component.linkedStatus()).toBe('error');
        expect(component.linkedItems()).toEqual([]);
        expect(component.status()).toBe('results');
        expect(component.items().length).toBe(10);
      }));

      it('a repository failing in either scope is reported as unavailable, not zero (KPM-R-6 per scope)', fakeAsync(() => {
        answerByScope(
          pageResponse([], 0, false, {
            sources: [sourceOk('cgspace', 0), sourceOk('melspace', 0), { repository: 'worldfish', status: 'timeout', total: 0, hasMore: false }]
          }),
          pageResponse(relatedItems, 80, true, { sources: [sourceOk('cgspace', 80), sourceOk('melspace', 0), sourceOk('worldfish', 0)] })
        );
        setBilateral();
        fixture.detectChanges();
        flush();

        expect(component.failedSources().map(source => source.repository)).toEqual(['worldfish']);
      }));

      it('a new reset clears both lists when nothing is searchable', fakeAsync(() => {
        answerByScope(pageResponse([linkedItem], 1, false), pageResponse(relatedItems, 80, true));
        setBilateral({ projectCode: '', projectTitle: '' });
        fixture.detectChanges();
        component.query.set('maize');
        component.runSearch(0);
        flush();
        component.linkedItems.set([linkedItem]);
        component.linkedStatus.set('results');

        component.query.set('');
        component.onQueryChange();

        expect(component.status()).toBe('idle');
        expect(component.items()).toEqual([]);
        expect(component.linkedItems()).toEqual([]);
        expect(component.linkedStatus()).toBe('idle');
        expect(component.linkedTotal()).toBe(0);
      }));
    });

    describe('KPSF-R-10: non-bilateral browse sends no project params and renders no project logic', () => {
      it('sends one request without any project* param even when project inputs are present', fakeAsync(() => {
        fixture.componentRef.setInput('enableProjectRepositoryFilter', false);
        fixture.componentRef.setInput('projectCode', PROJECT_CODE);
        fixture.componentRef.setInput('projectTitle', PROJECT_TITLE);
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.detectChanges();

        component.query.set('maize');
        component.runSearch(0);
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(Object.keys(calls[0]).filter(key => key.startsWith('project'))).toEqual([]);
        expect(calls[0]).toEqual({ query: 'maize', page: 0, size: 10, year: 2026, repository: 'cgspace,melspace,worldfish' });
        expect(component.linkedItems()).toEqual([]);
        expect(component.linkedStatus()).toBe('idle');
      }));

      it('does not auto-search on open outside bilateral browse', fakeAsync(() => {
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.detectChanges();
        tick(500);

        expect(mockResultsApiService.GET_cgspaceSearch).not.toHaveBeenCalled();
        expect(component.status()).toBe('idle');
      }));

      it('renders no project badge for items that carry projects[] (MEL/WorldFish expose them in plain browse)', fakeAsync(() => {
        mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
          of(pageResponse([createProjectItem('1', 'MEL paper', ['IITA - T-PJ-003763 something']), createProjectItem('2', 'Plain paper', [])], 2, false))
        );
        fixture.componentRef.setInput('phaseYear', 2026);
        fixture.componentRef.setInput('projectCode', PROJECT_CODE);
        fixture.componentRef.setInput('projectTitle', PROJECT_TITLE);
        fixture.detectChanges();

        component.query.set('paper');
        component.runSearch(0);
        flush();
        fixture.detectChanges();

        expect(component.status()).toBe('results');
        expect(fixture.nativeElement.querySelector('[data-test^="kp-project"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('.kp-project-match-badge')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Filter by project tag');
      }));
    });

    describe('KPAM kept: Science Program soft-sort within each list (KPSF-DD-5 kept)', () => {
      it('sorts SP matches first inside the linked list and inside the related list independently', () => {
        setBilateral({ programCode: 'SP01', programName: 'Sustainable Farming' });
        fixture.detectChanges();

        const mk = (id: string, accelerators: string[]) => createProjectItem(id, id, [], accelerators);
        const linkedPlain = mk('l1', ['Agroecology']);
        const linkedMatch = mk('l2', ['SP01 - Sustainable Farming']);
        const relatedPlain = mk('r1', []);
        const relatedMatch = mk('r2', ['Sustainable Farming']);

        component.items.set([relatedPlain, relatedMatch]);
        component.linkedItems.set([linkedPlain, linkedMatch]);

        expect(component.displayLinkedItems()).toEqual([linkedMatch, linkedPlain]);
        expect(component.displayItems()).toEqual([relatedMatch, relatedPlain]);
        expect(component.matchCount()).toBe(2);

        component.onlyMatches.set(true);
        expect(component.displayLinkedItems()).toEqual([linkedMatch]);
        expect(component.displayItems()).toEqual([relatedMatch]);
      });

      it('no project tag ever reorders or filters items any more (the project fuzzy matcher is gone)', () => {
        setBilateral();
        fixture.detectChanges();

        const tagged = createProjectItem('tagged', 'Tagged', ['T-PJ-003942 - IITA Accelerated Innovation Delivery Initiative (AID-I) for Mozambique']);
        const plain = createProjectItem('plain', 'Plain', []);
        component.items.set([plain, tagged]);

        expect(component.displayItems()).toEqual([plain, tagged]);
        component.onlyMatches.set(true);
        expect(component.displayItems()).toEqual([]);
      });
    });

    describe('KPSF-T-4: two-section template', () => {
      const q = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
      const text = (sel: string): string => q(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const open = (linked: unknown, related: unknown) => {
        answerByScope(linked, related);
        setBilateral();
        fixture.detectChanges();
        flush();
        fixture.detectChanges();
      };

      const okSources = (total: number) => ({ sources: [sourceOk('cgspace', total)], projectScope: { scope: 'x', applied: true } });
      const relatedMock = () => Array.from({ length: 80 }, (_, i) => createProjectItem(`r${i}`, `Related paper ${i}`, []));

      it('R-3 / R-6: linked [182744] is in section 1 with the linked badge and its project label; section 2 has the proxy note and a marker on every card, without 182744', fakeAsync(() => {
        open(pageResponse([linkedItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        const linked = q('[data-test="kp-linked-section"]')!;
        const related = q('[data-test="kp-related-section"]')!;
        expect(linked.querySelectorAll('h3').length).toBe(1);
        expect(text('[data-test="kp-linked-heading"]')).toBe('KPs linked to the project · 1');
        expect(text('[data-test="kp-related-heading"]')).toBe('Other KPs potentially related · 80');
        expect(linked.getAttribute('aria-label')).toBe('KPs linked to the project');
        expect(related.getAttribute('aria-label')).toBe('Other KPs potentially related');

        expect(linked.textContent).toContain('Strengthening bean seed systems');
        expect(related.textContent).not.toContain('Strengthening bean seed systems');
        expect(related.textContent).not.toContain('10568/182744');
        expect(linked.querySelectorAll('[data-test^="kp-linked-badge-"]').length).toBe(1);
        expect(linked.querySelector('[data-test^="kp-linked-badge-"]')!.textContent).toContain('Linked to T-PJ-003942');
        expect(linked.querySelector('[data-test^="kp-linked-project-labels-"]')!.textContent).toContain('Accelerated Innovation Delivery Initiative');
        expect(linked.querySelector('[data-test^="kp-proxy-marker-"]')).toBeNull();

        expect(related.querySelectorAll('[data-test^="kp-proxy-marker-"]').length).toBe(10);
        expect(related.querySelectorAll('h4').length).toBe(10);
        expect(related.querySelector('[data-test^="kp-linked-badge-"]')).toBeNull();
        expect(text('[data-test="kp-proxy-note"]')).toContain('not tagged with this project');
        expect(text('[data-test="kp-linked-info"]')).toBe(
          "Linked KPs are repository items whose project field contains this project's title words or PJ code."
        );
      }));

      it('R-1: a linked card with the 4 real labels (matching one last) shows every label, uncapped, in live order', fakeAsync(() => {
        const labels = [
          'PABRA Al Sumait Prize Award (Kuwait)',
          'CIMMYT (USA-USAID) - Accelerated Innovation Delivery Initiative (AIDI)',
          'AGRA -PABRA 2023 Africa Food Prize',
          'IITA (USA-USAID) - Accelerated Innovation Delivery Initiative (AID-I) for Mozambique'
        ];
        const fourLabelItem = createProjectItem('182744', 'Strengthening bean seed systems to reach 78,000 farmers', labels);
        open(pageResponse([fourLabelItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        const block = q('[data-test^="kp-linked-project-labels-"]')!;
        const content = block.textContent!;
        labels.forEach(label => expect(content).toContain(label));
        const positions = labels.map(label => content.indexOf(label));
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
        expect(block.querySelectorAll('[data-test="kp-linked-project-label"]').length).toBe(4);
      }));

      it('R-4: each section has its own Load more; section 2 Load more never fires a linked request', fakeAsync(() => {
        open(pageResponse([linkedItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        expect(q('[data-test="kp-linked-load-more"]')).toBeNull();
        mockResultsApiService.GET_cgspaceSearch.mockClear();
        q('[data-test="kp-related-load-more"]')!.click();
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(calls[0]['projectScope']).toBe('related');
        expect(calls[0]['page']).toBe(1);
      }));

      it('R-4: section 1 Load more fetches only the linked scope', fakeAsync(() => {
        open(pageResponse([linkedItem], 12, true, okSources(12)), pageResponse(relatedMock().slice(0, 10), 80, false, okSources(80)));

        mockResultsApiService.GET_cgspaceSearch.mockClear();
        q('[data-test="kp-linked-load-more"]')!.click();
        flush();

        const calls = searchCalls();
        expect(calls.length).toBe(1);
        expect(calls[0]['projectScope']).toBe('linked');
        expect(q('[data-test="kp-related-load-more"]')).toBeNull();
      }));

      it('R-5: linked = [] shows the compact empty state naming the project, never the generic no-results copy, and keeps section 2 visible', fakeAsync(() => {
        open(pageResponse([], 0, false, okSources(0)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        const empty = q('[data-test="kp-linked-empty"]')!;
        expect(empty).toBeTruthy();
        expect(empty.getAttribute('tabindex')).toBe('0');
        expect(empty.textContent).toContain(PROJECT_CODE);
        expect(empty.textContent).toContain(PROJECT_TITLE);
        expect(empty.textContent).toContain('No KP in the selected repositories is tagged with');
        expect(text('[data-test="kp-linked-heading"]')).toBe('KPs linked to the project · 0');
        expect(fixture.nativeElement.textContent).not.toContain('No items found for this search');
        expect(q('[data-test="cgspace-empty"]')).toBeNull();
        expect(q('[data-test="kp-related-section"]')!.querySelectorAll('[data-test^="kp-proxy-marker-"]').length).toBe(10);
        expect(q('[data-test="kp-proxy-note"]')).toBeTruthy();
      }));

      it('R-9: applied=false shows a one-line notice in section 1 and section 2 as normal', fakeAsync(() => {
        open(
          pageResponse([], 0, false, { projectScope: { scope: 'linked', applied: false }, sources: [] }),
          pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80))
        );

        expect(text('[data-test="kp-linked-not-applied"]')).toContain('no title words or PJ code');
        expect(q('[data-test="kp-linked-empty"]')).toBeNull();
        expect(q('[data-test="kp-related-section"]')!.querySelectorAll('[data-test^="kp-proxy-marker-"]').length).toBe(10);
      }));

      it('R-5 / KPM-R-6: a CGSpace source failing only in the linked scope reads unavailable (not 0 / 80) and is named in the empty state', fakeAsync(() => {
        open(
          pageResponse([], 0, false, { sources: [{ repository: 'cgspace', status: 'timeout', total: 0, hasMore: false }, sourceOk('melspace', 0)] }),
          pageResponse(relatedMock().slice(0, 10), 80, true, { sources: [sourceOk('cgspace', 80), sourceOk('melspace', 0)] })
        );

        const chip = q('[data-test="kp-repo-chip-cgspace"]')!;
        expect(chip.textContent).toContain('unavailable');
        expect(chip.textContent).not.toMatch(/\b0\b|\b80\b/);
        expect(text('[data-test="kp-linked-empty-unavailable"]')).toContain('CGSpace did not respond');
        expect(text('[data-test="kp-partial-notice-copy"]')).toContain('CGSpace did not respond');
      }));

      it('chips in two-scope mode count linked + related (1 + 80 = 81)', fakeAsync(() => {
        open(pageResponse([linkedItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        const chip = q('[data-test="kp-repo-chip-cgspace"]')!;
        expect(chip.textContent).toContain('81');
        expect(chip.textContent).not.toContain('unavailable');
      }));

      it('a CGSpace source failing only in the related scope reads unavailable in the chip', fakeAsync(() => {
        open(
          pageResponse([linkedItem], 1, false, okSources(1)),
          pageResponse(relatedMock().slice(0, 10), 0, false, { sources: [{ repository: 'cgspace', status: 'error', total: 0, hasMore: false }] })
        );

        expect(q('[data-test="kp-repo-chip-cgspace"]')!.textContent).toContain('unavailable');
      }));

      it('typing 1-2 characters keeps the user informed: the at-least-3-characters hint renders', fakeAsync(() => {
        open(pageResponse([linkedItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        component.query.set('ma');
        component.onQueryChange();
        fixture.detectChanges();

        const idle = q('[data-test="cgspace-idle"]')!;
        expect(idle.textContent).toContain('at least 3 characters');
        expect(idle.textContent).toContain('Clear the text');
      }));

      it('the Science Program match count is global and sits outside both sections', fakeAsync(() => {
        const spLinked = createProjectItem('sp1', 'SP linked', [], ['SP01 - Sustainable Farming']);
        answerByScope(pageResponse([spLinked], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));
        setBilateral({ programCode: 'SP01', programName: 'Sustainable Farming' });
        fixture.detectChanges();
        flush();
        fixture.detectChanges();

        const counter = q('[data-test="kp-results-counter"]')!;
        expect(counter.textContent).toContain('1 match Sustainable Farming');
        expect(counter.textContent).toContain('across both lists');
        expect(q('[data-test="kp-linked-section"]')!.contains(counter)).toBe(false);
        expect(q('[data-test="kp-related-section"]')!.contains(counter)).toBe(false);
        expect(fixture.nativeElement.querySelectorAll('[data-test^="kp-sp-match-"]').length).toBe(1);
      }));

      it('removed copy never renders in the bilateral template', fakeAsync(() => {
        open(pageResponse([linkedItem], 1, false, okSources(1)), pageResponse(relatedMock().slice(0, 10), 80, true, okSources(80)));

        const content = fixture.nativeElement.textContent;
        expect(content).not.toContain('highlight matching only');
        expect(content).not.toContain('does not hide other items');
        expect(q('[data-test="kp-project-repository-filter"]')).toBeNull();
      }));

      it('R-10: a non-bilateral browse renders a single list without sections, badges or proxy markers', fakeAsync(() => {
        fixture.componentRef.setInput('phaseYear', 2026);
        mockResultsApiService.GET_cgspaceSearch.mockReturnValue(of(pageResponse(relatedMock().slice(0, 3), 3, false)));
        fixture.detectChanges();
        component.query.set('paper');
        component.runSearch(0);
        flush();
        fixture.detectChanges();

        expect(q('[data-test="kp-linked-section"]')).toBeNull();
        expect(q('[data-test="kp-related-section"]')).toBeNull();
        expect(q('[data-test^="kp-proxy-marker-"]')).toBeNull();
        expect(q('[data-test^="kp-linked-badge-"]')).toBeNull();
        expect(fixture.nativeElement.querySelectorAll('h4').length).toBe(3);
      }));
    });

    // @akili-spec changes/kp-related-relevance-ranking — KRR-T-4 (R-3 client side, R-4, R-7, R-8)
    describe('KRR-T-4: relevance context params, tier badge, factors, tooltips and ranked note', () => {
      const q = (sel: string): HTMLElement | null => fixture.nativeElement.querySelector(sel);
      const qa = (sel: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(sel));
      const text = (sel: string): string => q(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const ranked = (id: string, tier: KpProjectMatchTier, factors: KpProjectMatchFactor[]): CgspaceItemDto => ({
        ...createProjectItem(id, `Ranked paper ${id}`, []),
        subjects: ['maize'],
        projectMatch: { tier, factors }
      });

      const open = (related: CgspaceItemDto[], rankedFlag: boolean | undefined, inputs: Record<string, unknown> = {}) => {
        const echo = rankedFlag === undefined ? {} : { ranked: rankedFlag };
        answerByScope(
          pageResponse([linkedItem], 1, false, { projectScope: { scope: 'linked', applied: true }, sources: [sourceOk('cgspace', 1)] }),
          pageResponse(related, related.length, false, { projectScope: { scope: 'related', applied: true, ...echo }, sources: [sourceOk('cgspace', related.length)] })
        );
        setBilateral(inputs);
        fixture.detectChanges();
        flush();
        fixture.detectChanges();
      };

      describe('request params', () => {
        const openAndGetCalls = (inputs: Record<string, unknown>) => {
          answerByScope(pageResponse([], 0, false), pageResponse([], 0, false));
          setBilateral(inputs);
          fixture.detectChanges();
          flush();
          return searchCalls();
        };

        it('sends projectDescription, projectProgram and projectLeadCenterName with the scope, on both requests', fakeAsync(() => {
          const calls = openAndGetCalls({ projectDescription: '  Seed systems for beans  ', programCode: 'SP09', programName: 'Climate Action', leadCenterAcronym: 'CIP' });

          expect(calls.length).toBe(2);
          for (const call of calls) {
            expect(call['projectDescription']).toBe('Seed systems for beans');
            expect(call['projectProgram']).toBe('SP09 - Climate Action');
            expect(call['projectLeadCenterName']).toBe('International Potato Center');
            expect(call['projectLeadCenter']).toBe('CIP');
          }
        }));

        it('truncates the description to 1000 and the program to 200 characters', fakeAsync(() => {
          const call = openAndGetCalls({ projectDescription: 'd'.repeat(1500), programCode: 'P'.repeat(150), programName: 'N'.repeat(150) })[0];

          expect(call['projectDescription'].length).toBe(1000);
          expect(call['projectProgram'].length).toBe(200);
        }));

        it('accepts a program with the code only, without a dangling separator', fakeAsync(() => {
          expect(openAndGetCalls({ programCode: 'SP09', programName: '' })[0]['projectProgram']).toBe('SP09');
        }));

        it('accepts a program with the name only, without a dangling separator', fakeAsync(() => {
          expect(openAndGetCalls({ programCode: '', programName: 'Climate Action' })[0]['projectProgram']).toBe('Climate Action');
        }));

        it('omits projectLeadCenterName for an unknown acronym, and every new param when its source is empty', fakeAsync(() => {
          const call = openAndGetCalls({ leadCenterAcronym: 'ZZZ', projectDescription: '', programCode: '', programName: '' })[0];

          expect(call['projectLeadCenter']).toBe('ZZZ');
          expect(call['projectLeadCenterName']).toBeUndefined();
          expect(call['projectDescription']).toBeUndefined();
          expect(call['projectProgram']).toBeUndefined();
        }));

        it('sends none of the new params without a scope (non-bilateral browse)', fakeAsync(() => {
          mockResultsApiService.GET_cgspaceSearch.mockReturnValue(of(pageResponse([], 0, false)));
          setBilateral({ enableProjectRepositoryFilter: false, projectDescription: 'desc', programCode: 'SP09', programName: 'Climate Action', leadCenterAcronym: 'CIP' });
          fixture.detectChanges();
          component.query.set('maize');
          component.runSearch(0);
          flush();

          const call = searchCalls()[0];
          for (const key of ['projectDescription', 'projectProgram', 'projectLeadCenterName', 'projectScope']) {
            expect(call[key]).toBeUndefined();
          }
        }));
      });

      describe('tier badge and factor line', () => {
        it('keywords + center: "Partial match" and "Project keywords · Center"', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords', 'center'])], true);

          expect(text('[data-test="kp-match-tier-uuid-p1"]')).toBe('Partial match');
          expect(text('[data-test="kp-match-factors-uuid-p1"]')).toBe('Project keywords · Center');
        }));

        it('uses the four exact tier labels and the fixed factor order', fakeAsync(() => {
          open(
            [
              ranked('s', 'strong', ['keywords', 'center', 'program']),
              ranked('p', 'partial', ['center', 'program']),
              ranked('w', 'weak', ['program']),
              ranked('n', 'none', [])
            ],
            true
          );

          expect(text('[data-test="kp-match-tier-uuid-s"]')).toBe('Strong match');
          expect(text('[data-test="kp-match-factors-uuid-s"]')).toBe('Project keywords · Center · Science Program');
          expect(text('[data-test="kp-match-tier-uuid-p"]')).toBe('Partial match');
          expect(text('[data-test="kp-match-factors-uuid-p"]')).toBe('Center · Science Program');
          expect(text('[data-test="kp-match-tier-uuid-w"]')).toBe('Weak match');
          expect(text('[data-test="kp-match-factors-uuid-w"]')).toBe('Science Program');
          expect(text('[data-test="kp-match-tier-uuid-n"]')).toBe('No direct match');
        }));

        it('the none tier shows "No direct match" and no factor line', fakeAsync(() => {
          open([ranked('n', 'none', [])], true);

          expect(text('[data-test="kp-match-tier-uuid-n"]')).toBe('No direct match');
          expect(q('[data-test="kp-match-factors-uuid-n"]')).toBeNull();
        }));

        it('renders no percentage or numeric score anywhere in the related cards', fakeAsync(() => {
          open(
            [ranked('s', 'strong', ['keywords', 'center', 'program']), ranked('p', 'partial', ['keywords']), ranked('n', 'none', [])],
            true
          );

          const related = q('[data-test="kp-related-section"]')!;
          expect(related.querySelectorAll('[data-test^="kp-match-tier-"]').length).toBe(3);
          expect(related.textContent).not.toContain('%');
        }));

        it('keeps the Proxy marker on every related card, with the badge after it', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords'])], true);

          const marker = q('[data-test="kp-proxy-marker-uuid-p1"]')!;
          expect(marker.textContent).toContain('Proxy');
          expect(marker.nextElementSibling).toBe(q('[data-test="kp-match-tier-uuid-p1"]'));
        }));

        it('linked cards never show a tier or a factor line, even when the item carries projectMatch', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords'])], true);
          const linked = q('[data-test="kp-linked-section"]')!;
          expect(linked.querySelector('[data-test^="kp-match-"]')).toBeNull();

          const withMatch = { ...linkedItem, projectMatch: { tier: 'strong', factors: ['keywords'] } } as CgspaceItemDto;
          answerByScope(pageResponse([withMatch], 1, false), pageResponse([], 0, false));
          component.runSearch(0);
          flush();
          fixture.detectChanges();

          expect(q('[data-test="kp-linked-section"]')!.textContent).toContain('Strengthening bean seed systems');
          expect(q('[data-test="kp-linked-section"]')!.querySelector('[data-test^="kp-match-"]')).toBeNull();
        }));

        it('a related item without projectMatch (inactive ranking) shows the Proxy marker but no badge', fakeAsync(() => {
          open([createProjectItem('x', 'Plain related', [])], undefined);

          expect(q('[data-test="kp-proxy-marker-uuid-x"]')).toBeTruthy();
          expect(q('[data-test^="kp-match-"]')).toBeNull();
        }));
      });

      describe('tooltips (Spartan hlmTooltip, keyboard focusable)', () => {
        const brnTooltipText = (selector: string): string | null | undefined => {
          const debug = fixture.debugElement.query(By.css(selector));
          const input = debug?.injector.get(BrnTooltip).brnTooltip as unknown;
          return (typeof input === 'function' ? input() : input) as string | null | undefined;
        };

        it('the Proxy marker has the proxyMarkerTooltip copy, is focusable, and no longer relies on the native title', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords'])], true);

          const marker = q('[data-test="kp-proxy-marker-uuid-p1"]')!;
          expect(brnTooltipText('[data-test="kp-proxy-marker-uuid-p1"]')).toBe(
            'Proxy: this KP is not tagged with this project in the repository. Its relation to the project is approximate — see the match label.'
          );
          expect(brnTooltipText('[data-test="kp-proxy-marker-uuid-p1"]')).toBe(component.copy.proxyMarkerTooltip);
          expect(marker.getAttribute('tabindex')).toBe('0');
          expect(marker.hasAttribute('title')).toBe(false);
          expect(marker.getAttribute('aria-label')).toBe('Proxy: not tagged with this project, relation is approximate');
        }));

        it('the tier badge is a Spartan hlmBadge with the approximation tooltip and is focusable', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords'])], true);

          const badge = q('[data-test="kp-match-tier-uuid-p1"]')!;
          expect(badge.getAttribute('data-slot')).toBe('badge');
          expect(badge.getAttribute('data-variant')).toBe('outline');
          expect(badge.getAttribute('tabindex')).toBe('0');
          expect(brnTooltipText('[data-test="kp-match-tier-uuid-p1"]')).toBe(
            'Approximate: based on matching subjects, Center and Science Program with this project. Not tagged with the project.'
          );
        }));
      });

      describe('proxy note (KRR-R-8)', () => {
        it('shows the ranked copy only when projectScope.ranked is true', fakeAsync(() => {
          open([ranked('p1', 'partial', ['keywords'])], true);

          expect(text('[data-test="kp-proxy-note"]')).toContain(
            'These KPs are not tagged with this project in the repository. They are ordered by similarity to the project (subjects, Center, Science Program); the match label is an approximation.'
          );
          expect(text('[data-test="kp-proxy-note"]')).not.toContain('newest first');
        }));

        it.each([[false], [undefined]])(
          'keeps the quick copy when ranked is %s',
          fakeAsync((rankedFlag: boolean | undefined) => {
            open([createProjectItem('x', 'Plain related', [])], rankedFlag);

            expect(text('[data-test="kp-proxy-note"]')).toContain('not tagged with this project');
            expect(text('[data-test="kp-proxy-note"]')).toContain('newest first');
            expect(text('[data-test="kp-proxy-note"]')).not.toContain('ordered by similarity');
          })
        );
      });
    });

    describe('Bilateral empty and filter-summary states (kept behavior)', () => {
      it('explains unavailable repositories when both scopes are empty: section 1 and section 2 empty states, no generic copy in section 1', fakeAsync(() => {
        mockResultsApiService.GET_cgspaceSearch.mockReturnValue(
          of(
            pageResponse([], 0, false, {
              sources: [
                { repository: 'cgspace', status: 'timeout', total: 0 },
                { repository: 'melspace', status: 'ok', total: 0 },
                { repository: 'worldfish', status: 'ok', total: 0 }
              ]
            })
          )
        );
        setBilateral();
        fixture.detectChanges();

        component.query.set('Fertilize Right');
        component.runSearch(0);
        flush();
        fixture.detectChanges();

        const linkedEmpty = fixture.nativeElement.querySelector('[data-test="kp-linked-empty"]');
        expect(linkedEmpty.textContent).not.toContain('No items found for this search');
        expect(fixture.nativeElement.querySelector('[data-test="kp-linked-empty-unavailable"]')?.textContent).toContain('CGSpace did not respond');
        expect(fixture.nativeElement.querySelector('[data-test="kp-related-empty"]')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[data-test="kp-active-filters-summary"]')).toBeTruthy();
      }));

      it('renders the applied-filters summary only in bilateral browse, without the removed facet chip copy', () => {
        setBilateral();
        component.query.set('Fertilize Right');
        fixture.detectChanges();

        const summary = fixture.nativeElement.querySelector('[data-test="kp-active-filters-summary"]');
        expect(summary).toBeTruthy();
        expect(summary.textContent).toContain('Applied filters');
        expect(summary.textContent).toContain(PROJECT_CODE);
        expect(summary.textContent).not.toContain('Filter by project tag');
        expect(summary.textContent).not.toContain('highlight matching only');
        expect(summary.textContent).not.toContain('does not hide other items');
        expect(fixture.nativeElement.querySelector('[data-test="kp-project-repository-filter"]')).toBeNull();
      });

      it('does not render the applied-filters summary outside bilateral browse', () => {
        fixture.componentRef.setInput('enableProjectRepositoryFilter', false);
        fixture.componentRef.setInput('phaseYear', 2026);
        component.query.set('maize');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[data-test="kp-active-filters-summary"]')).toBeFalsy();
      });
    });
  });
});
