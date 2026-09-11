import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RdGeographicLocationComponent } from './rd-geographic-location.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { GeoScopeEnum } from '../../../../../../shared/enum/geo-scope.enum';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('RdGeographicLocationComponent', () => {
  let component: RdGeographicLocationComponent;
  let fixture: ComponentFixture<RdGeographicLocationComponent>;
  let mockApiService: any;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_geographicSection: () => of({}),
        PATCH_geographicSection: () => of({}),
        PATCH_geographicSectionp25: (_payload?: any) => of({}),
        PATCH_resyncKnowledgeProducts: () => of({}),
        GET_TypeByResultLevel: () => of({}),
        GET_AllCLARISARegions: () => of({}),
        GET_AllCLARISACountries: () => of({})
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Geographic location'),
        isKnowledgeProduct: true,
        getLastWord: jest.fn()
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdGeographicLocationComponent,
        SaveButtonComponent,
        PrFieldHeaderComponent,
        PrRadioButtonComponent,
        SyncButtonComponent,
        AlertStatusComponent,
        DetailSectionTitleComponent
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeographicLocationComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('geographic_focus_description()', () => {
    it('should return description for region when id = 2', () => {
      const result = component.geographic_focus_description(2);
      expect(result).toBe(
        'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.'
      );
    });
    it('should return description for region when id = 3', () => {
      const result = component.geographic_focus_description(3);
      expect(result).toBe(
        'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.'
      );
    });
  });

  describe('getSectionInformation()', () => {
    it('should set geo_scope_id to GeoScopeEnum.COUNTRY if it is legacyCountries', () => {
      const mockResponse = { response: { geo_scope_id: 4 } };
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of(mockResponse));

      component.getSectionInformation();

      expect(component.geographicLocationBody.geo_scope_id).toBe(GeoScopeEnum.COUNTRY);
    });
  });

  describe('onSaveSection()', () => {
    it('should call onSaveSection and update geographicLocationBody', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSection');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });

    /**
     * 🛑 The extra geographic scope block is only on screen while the MAIN focus is neither Global nor
     * "yet to be determined". Switching the main focus back to one of those hides the block, and its
     * answers used to keep being saved: the result carried an extra scope with regions and countries
     * that nobody could see or reach any more.
     */
    describe('extra geographic scope, when the main focus hides it', () => {
      const withMainFocus = (geoScopeId: number) => {
        (component.fieldsManagerSE as any).isP25 = () => true;
        component.geographicLocationBody.geo_scope_id = geoScopeId;
        component.extraGeographicLocationBody.has_extra_geo_scope = true;
        component.extraGeographicLocationBody.geo_scope_id = GeoScopeEnum.REGIONAL;
        component.extraGeographicLocationBody.regions = [{ id: 7 }] as any;
        component.extraGeographicLocationBody.countries = [{ id: 9 }] as any;
        component.extraGeographicLocationBody.has_regions = true;
        component.extraGeographicLocationBody.has_countries = true;
      };

      it.each([
        ['Global', GeoScopeEnum.GLOBAL],
        ['yet to be determined', GeoScopeEnum.DETERMINED]
      ])('drops the orphaned extra scope when the main focus is %s', (_label, scopeId) => {
        const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSectionp25');
        withMainFocus(scopeId as number);

        component.onSaveSection();

        const [payload] = spy.mock.calls[spy.mock.calls.length - 1];
        expect(payload.has_extra_geo_scope).toBe(false);
        expect(payload.extra_geo_scope_id).toBeNull();
        expect(payload.extra_regions).toEqual([]);
        expect(payload.extra_countries).toEqual([]);
        expect(payload.has_extra_regions).toBe(false);
        expect(payload.has_extra_countries).toBe(false);
      });

      it('keeps the extra scope untouched while the block is still on screen', () => {
        const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSectionp25');
        withMainFocus(GeoScopeEnum.COUNTRY);

        component.onSaveSection();

        const [payload] = spy.mock.calls[spy.mock.calls.length - 1];
        expect(payload.has_extra_geo_scope).toBe(true);
        expect(payload.extra_geo_scope_id).toBe(GeoScopeEnum.REGIONAL);
        expect(payload.extra_regions).toEqual([{ id: 7 }]);
      });
    });
  });

  describe('onSyncSection()', () => {
    it('should call onSyncSection and update geographicLocationBody', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.onSyncSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('thereAnyRegionText()', () => {
    it('should return the correct text with UNM49 link', () => {
      const result = component.thereAnyRegionText();

      const expectedText = `The list of regions below follows the <a href='${component.UNM49}' class="open_route" target='_blank'>UN (M.49)<a> standard`;
      expect(result).toBe(expectedText);
    });
  });

  describe('thereAnycountriesText()', () => {
    it('should return the correct text with ISO3166 link', () => {
      const result = component.thereAnycountriesText();

      const expectedText = `The list of countries below follows the <a href='${component.ISO3166}' class="open_route" target='_blank'>ISO 3166<a> standard`;
      expect(result).toBe(expectedText);
    });
  });

  /**
   * This section loads from an `effect()` gated on the portfolio, so between first paint and the
   * GET there is no request in flight at all — the skeleton must therefore start raised. Neither
   * GET had an `error` branch before, which would have left it shimmering forever.
   */
  describe('sectionLoading (skeleton)', () => {
    it('starts raised, before any request has been made', () => {
      expect(component.sectionLoading()).toBe(true);
    });

    it('is released when the P22 section GET responds', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: {} }));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P22 section GET fails, so the skeleton can never get stuck', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(throwError(() => new Error('boom')));

      component.getSectionInformation();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P25 section GET responds', () => {
      mockApiService.resultsSE.GET_geographicSectionp25 = () => of({ response: {} });

      component.getSectionInformationp25();

      expect(component.sectionLoading()).toBe(false);
    });

    it('is released when the P25 section GET fails', () => {
      mockApiService.resultsSE.GET_geographicSectionp25 = () => throwError(() => new Error('boom'));

      component.getSectionInformationp25();

      expect(component.sectionLoading()).toBe(false);
    });
  });

  // ----- P2-3201 (point 5): geographic focus question, unified inside 2026 only -----
  describe('P2-3201 — geographic focus question wording', () => {
    const asContext = (opts: { is2026: boolean; isP25?: boolean; isInnovation?: boolean }) => {
      (component as any).fieldsManagerSE = {
        isGeographicLocation2026: () => opts.is2026,
        isP25: () => opts.isP25 ?? true,
        isAnInnovation: () => opts.isInnovation ?? false
      };
    };

    it('uses the unified 2026 question for an innovation, replacing the P2-3036 (AC9) "location of benefit" wording', () => {
      asContext({ is2026: true, isP25: true, isInnovation: true });

      expect(component.geographicFocusLabel()).toBe('What is the geographic focus of the result?');
      expect(component.geographicFocusHeader()).toBe('What is the geographic focus of the result?');
    });

    it('uses the same unified question for a non-innovation result in 2026', () => {
      asContext({ is2026: true, isP25: true, isInnovation: false });

      expect(component.geographicFocusLabel()).toBe('What is the geographic focus of the result?');
      expect(component.geographicFocusHeader()).toBe('What is the geographic focus of the result?');
    });

    it('keeps the legacy innovation wording for a P25 innovation before 2026', () => {
      asContext({ is2026: false, isP25: true, isInnovation: true });

      expect(component.geographicFocusLabel()).toBe('What is the current geographic focus of the innovation development, testing and/or use?');
      expect(component.geographicFocusHeader()).toBe('What is the current geographic focus of the innovation development, testing and/or use?');
    });

    it('leaves the label undefined before 2026 for other results, so app-geoscope-management keeps building its own', () => {
      asContext({ is2026: false, isP25: true, isInnovation: false });

      expect(component.geographicFocusLabel()).toBeUndefined();
      expect(component.geographicFocusHeader()).toBe('What is the main geographic focus of the Output?');
    });
  });

  // ----- GEO-T-1: unanswered "other geographic areas" question stays unanswered -----
  describe('fillExtraGeographicLocationBody() — has_extra_geo_scope null-vs-boolean (GEO-R-1..2)', () => {
    const baseResponse = {
      extra_geo_scope_id: null,
      has_extra_regions: false,
      has_extra_countries: false,
      extra_countries: [],
      extra_regions: []
    };

    it('preserves null (unanswered) instead of coercing it to false', () => {
      component.fillExtraGeographicLocationBody({ ...baseResponse, has_extra_geo_scope: null });

      expect(component.extraGeographicLocationBody.has_extra_geo_scope).toBeNull();
    });

    it('keeps a real "No" answer (false) unchanged', () => {
      component.fillExtraGeographicLocationBody({ ...baseResponse, has_extra_geo_scope: false });

      expect(component.extraGeographicLocationBody.has_extra_geo_scope).toBe(false);
    });

    it('keeps a real "Yes" answer (true) unchanged', () => {
      component.fillExtraGeographicLocationBody({ ...baseResponse, has_extra_geo_scope: true });

      expect(component.extraGeographicLocationBody.has_extra_geo_scope).toBe(true);
    });
  });

  // ----- GEO-T-1: the [isComplete] predicate must treat null the same as undefined (GEO-R-3) -----
  describe('[isComplete] predicate for has_extra_geo_scope (component.hasExtraGeoScopeAnswered, bound in the template)', () => {
    it('is false when unanswered (null)', () => {
      component.extraGeographicLocationBody.has_extra_geo_scope = null;

      expect(component.hasExtraGeoScopeAnswered()).toBe(false);
    });

    it('is false when never set (undefined)', () => {
      component.extraGeographicLocationBody.has_extra_geo_scope = undefined;

      expect(component.hasExtraGeoScopeAnswered()).toBe(false);
    });

    it('is true when answered "No" (false)', () => {
      component.extraGeographicLocationBody.has_extra_geo_scope = false;

      expect(component.hasExtraGeoScopeAnswered()).toBe(true);
    });

    it('is true when answered "Yes" (true)', () => {
      component.extraGeographicLocationBody.has_extra_geo_scope = true;

      expect(component.hasExtraGeoScopeAnswered()).toBe(true);
    });
  });

  // ----- P2-3371: the "other geographic areas" question and its completeness entry -----
  describe('P2-3371 — extra geo scope question is only tracked while it is on screen', () => {
    const withField = (field: any) => {
      (component as any).fieldsManagerSE = { fields: () => ({ '[geoscope-management]-has_extra_geo_scope': field }) };
    };

    it('does not register the question for a P22 result, where FieldsManagerService hides it', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: true
      });

      expect(component.showExtraGeoScopeQuestion()).toBe(false);
    });

    it('registers the question when it is rendered (P25 innovation)', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: false
      });

      expect(component.showExtraGeoScopeQuestion()).toBe(true);
    });

    it('names the completeness entry with the wording the user actually reads, not a second hard-coded one', () => {
      withField({
        label: 'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?',
        hide: false
      });

      expect(component.extraGeoScopeHeader()).toBe(
        'Are there any other geographic areas where  the innovation could be impactful (beyond current development and use)?'
      );
      expect(component.extraGeoScopeHeader()).not.toContain('for this Output');
    });

    it('survives a fields map that has no entry for the question', () => {
      (component as any).fieldsManagerSE = { fields: () => ({}) };

      expect(component.showExtraGeoScopeQuestion()).toBe(false);
      expect(component.extraGeoScopeHeader()).toBe('');
    });
  });

  /**
   * `UCA-T-7` — `CanComponentDeactivate` wiring. `SectionDirtyTrackerService` is component-scoped
   * (`providers: [SectionDirtyTrackerService]`), so each spec gets a fresh instance via
   * `TestBed.createComponent` in the top-level `beforeEach` — no cross-test snapshot leakage.
   *
   * Load-flow timing investigation (per `UCA-T-6`'s attempt-1 FAIL lesson): unlike
   * `RdGeneralInformationComponent`, `fillGeographicLocationBody()` and
   * `fillExtraGeographicLocationBody()` mutate `geographicLocationBody`/`extraGeographicLocationBody`
   * entirely SYNCHRONOUSLY inside the GET's own `next` handler — neither method fires a secondary
   * async call itself. That is true but was not the whole picture (attempt-1 Reviewer FAIL): a
   * rendered CHILD component, `app-sub-geoscope` (shown by `app-geoscope-management` whenever
   * `geo_scope_id === GeoScopeEnum.SUB_NATIONAL`), mutates `geographicLocationBody.countries[i]
   * .sub_national` in its own `ngOnInit` — first synchronously, then again asynchronously once
   * `GET_subNationalByIsoAlpha2` resolves — AFTER this component's own snapshot already ran. The
   * fix is `normalizeCountriesForDiff()` (component .ts): it defaults a missing `sub_national` to
   * `[]` and strips the child-added `formatedName` key before the tracker ever diffs, applied
   * identically on the snapshot and the live side, so the diff is insensitive to that decoration.
   * The `'is false after a load with a SUB_NATIONAL fixture...'` test below drives that exact
   * mutation directly on component state (this file's `NO_ERRORS_SCHEMA` setup does not render
   * `app-sub-geoscope`, so the child's own two writes are simulated in place rather than through a
   * real child subtree — confirmed non-vacuous: reverting `normalizeCountriesForDiff()` makes it
   * fail). The save-path race (`performSave()`'s `tap` snapshotting directly vs. relying solely on
   * the delegated reload) is still genuinely async (real `HttpClient` PATCH followed by a real
   * reload GET), so that half is proven with `fakeAsync`/`tick()` and a reload forced to fail,
   * exactly like `UCA-T-6`.
   */
  describe('CanComponentDeactivate (UCA-T-7)', () => {
    /**
     * Local, test-scoped fixtures — not the file-level shared mocks. `getSectionInformation()`/
     * `getSectionInformationp25()` assign `geographicLocationBody`/`extraGeographicLocationBody` by
     * reference (`fillGeographicLocationBody` does `this.geographicLocationBody = response`), so a
     * shared literal mutated by an earlier test in this file could converge and mask a broken diff.
     */
    const loadedLegacyResponse = () => ({ geo_scope_id: GeoScopeEnum.REGIONAL, regions: [10], countries: [], has_regions: true, has_countries: false });
    const loadedP25Response = () => ({
      geo_scope_id: GeoScopeEnum.COUNTRY,
      regions: [],
      countries: [20],
      has_regions: false,
      has_countries: true,
      extra_geo_scope_id: GeoScopeEnum.REGIONAL,
      extra_regions: [11],
      extra_countries: [],
      has_extra_regions: true,
      has_extra_countries: false,
      has_extra_geo_scope: true
    });

    describe('legacy (non-P25) load/save', () => {
      it('is false right after getSectionInformation() completes', () => {
        jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: loadedLegacyResponse() }));

        component.getSectionInformation();

        expect(component.hasUnsavedChanges()).toBe(false);
      });

      /**
       * Falsifying input: snapshotting only once at load (never again after save) would report
       * `true` here too — this test alone doesn't distinguish "no snapshot" from "correct snapshot",
       * but combined with the next test it does.
       */
      it('is true after editing geographicLocationBody', () => {
        jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: loadedLegacyResponse() }));
        component.getSectionInformation();

        component.geographicLocationBody.regions = [...component.geographicLocationBody.regions, 99];

        expect(component.hasUnsavedChanges()).toBe(true);
      });

      /**
       * Falsifying input: relying SOLELY on the delegated `getSectionInformation()` reload inside
       * `performSave()`'s `tap` (the exact `UCA-T-6` attempt-1 bug) would leave this section dirty
       * forever once that reload fails, even though the PATCH itself genuinely succeeded. Forcing
       * the reload's own GET to throw isolates the direct `dirtyTracker.snapshot(...)` call as the
       * only thing that can make this assertion pass.
       */
      it('is false right when saveSection() emits true, even when the follow-up reload fails entirely', fakeAsync(() => {
        jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: loadedLegacyResponse() }).pipe(delay(0)));
        component.getSectionInformation();
        tick();
        component.geographicLocationBody.regions = [...component.geographicLocationBody.regions, 99];
        expect(component.hasUnsavedChanges()).toBe(true);

        jest.spyOn(mockApiService.resultsSE, 'PATCH_geographicSection').mockReturnValue(of({}).pipe(delay(0)));
        mockApiService.resultsSE.GET_geographicSection.mockReturnValue(throwError(() => new Error('reload failed')).pipe(delay(0)));

        let sawTrue = false;
        component.saveSection().subscribe(result => {
          sawTrue = result === true;
          expect(component.hasUnsavedChanges()).toBe(false);
        });
        tick();

        expect(sawTrue).toBe(true);
      }));

      /**
       * `UCA-T-7` rework (Reviewer FAIL, attempt 1) — drives the REAL post-snapshot mutation
       * `app-sub-geoscope.ngOnInit()` performs on a SUB_NATIONAL result: first a synchronous
       * `sub_national = sub_national || []` default, then (after `GET_subNationalByIsoAlpha2`
       * resolves) a rewrite of every `sub_national` entry adding a `formatedName` key. Both writes
       * happen AFTER `getSectionInformation()`'s own snapshot, exactly as they would in
       * production; this file's `NO_ERRORS_SCHEMA` setup does not instantiate the real child, so
       * the mutation is simulated directly on `geographicLocationBody.countries[0]` — the same
       * object the snapshot already captured.
       *
       * Falsifying input: without `normalizeCountriesForDiff()`, the second (post-`tick()`)
       * assertion fails, because the raw JSON diff sees the added `formatedName` key. Self-verified
       * by reverting `normalizeCountriesForDiff()` to `return countries ?? [];` and re-running —
       * see the Implementer's report for the revert/re-run evidence.
       */
      it('is false after a load with a SUB_NATIONAL fixture whose sub-geoscope child decorates sub_national post-snapshot', fakeAsync(() => {
        const country: any = { id: 1, iso_alpha_2: 'US', full_name: 'United States', sub_national: [{ code: 'US-CA', name: 'California' }] };
        const response = {
          geo_scope_id: GeoScopeEnum.SUB_NATIONAL,
          regions: [],
          countries: [country],
          has_regions: false,
          has_countries: true
        };
        jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response }).pipe(delay(0)));

        component.getSectionInformation();
        tick();

        expect(component.hasUnsavedChanges()).toBe(false);

        // Step 1 of app-sub-geoscope.ngOnInit(): synchronous default, mutating the SAME object.
        const loadedCountry: any = component.geographicLocationBody.countries[0];
        loadedCountry.sub_national = loadedCountry.sub_national || [];
        // Step 2: GET_subNationalByIsoAlpha2 resolves asynchronously and rewrites every entry.
        tick();
        loadedCountry.sub_national = loadedCountry.sub_national.map((el: any) => ({ ...el, formatedName: '<strong>California</strong>' }));

        expect(component.hasUnsavedChanges()).toBe(false);
      }));

      it('saveSection() resolves false (not throws) on a failing PATCH_geographicSection, without reloading the section', fakeAsync(() => {
        jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response: loadedLegacyResponse() }).pipe(delay(0)));
        component.getSectionInformation();
        tick();
        const reloadSpy = jest.spyOn(component, 'getSectionInformation');
        jest
          .spyOn(mockApiService.resultsSE, 'PATCH_geographicSection')
          .mockReturnValue(throwError(() => new Error('save failed')).pipe(delay(0)));

        let result: boolean | undefined;
        let errored = false;
        component.saveSection().subscribe({
          next: value => (result = value),
          error: () => (errored = true)
        });
        tick();

        expect(errored).toBe(false);
        expect(result).toBe(false);
        expect(reloadSpy).not.toHaveBeenCalled();
      }));
    });

    describe('P25 load/save', () => {
      beforeEach(() => {
        (component.fieldsManagerSE as any).isP25 = () => true;
      });

      it('is false right after getSectionInformationp25() completes (both bodies tracked)', () => {
        mockApiService.resultsSE.GET_geographicSectionp25 = () => of({ response: loadedP25Response() });

        component.getSectionInformationp25();

        expect(component.hasUnsavedChanges()).toBe(false);
      });

      /** extraGeographicLocationBody edits alone must count as unsaved changes. */
      it('is true after editing extraGeographicLocationBody only', () => {
        mockApiService.resultsSE.GET_geographicSectionp25 = () => of({ response: loadedP25Response() });
        component.getSectionInformationp25();

        component.extraGeographicLocationBody.regions = [...component.extraGeographicLocationBody.regions, 42];

        expect(component.hasUnsavedChanges()).toBe(true);
      });

      it('is false right when saveSection() emits true on the P25 path, even when the follow-up reload fails entirely', fakeAsync(() => {
        mockApiService.resultsSE.GET_geographicSectionp25 = jest.fn(() => of({ response: loadedP25Response() }).pipe(delay(0)));
        component.getSectionInformationp25();
        tick();
        component.extraGeographicLocationBody.regions = [...component.extraGeographicLocationBody.regions, 42];
        expect(component.hasUnsavedChanges()).toBe(true);

        mockApiService.resultsSE.PATCH_geographicSectionp25 = jest.fn(() => of({}).pipe(delay(0)));
        mockApiService.resultsSE.GET_geographicSectionp25 = jest.fn(() => throwError(() => new Error('reload failed')).pipe(delay(0)));

        let sawTrue = false;
        component.saveSection().subscribe(result => {
          sawTrue = result === true;
          expect(component.hasUnsavedChanges()).toBe(false);
        });
        tick();

        expect(sawTrue).toBe(true);
      }));
    });
  });

  /**
   * `UCA-OQ-2` — serializability check, corrected (Reviewer FAIL, attempt 1): the previous version
   * of this test round-tripped a literal assigned in the SAME test — it exercised no loaded state
   * and passed by construction. It also recorded an inaccurate finding: `GeographicLocationBody`'s
   * DECLARED type is `regions: number[]` / `countries: number[]`, but at runtime `pr-multi-select`
   * (`onSelectOption()`) pushes full option OBJECTS, not ids — confirmed by the pre-existing test
   * above that already uses `[{ id: 7 }]`-shaped fixtures, and by `app-sub-geoscope` nesting a
   * `sub_national` array inside each `countries[i]`.
   *
   * This version drives a REAL load (`getSectionInformation()`) with a realistic nested fixture —
   * object arrays for `regions`/`countries`, a populated `sub_national` array on one country — and
   * round-trips the bodies the component actually holds afterward. Still `JSON.stringify`-lossless
   * (no `File`/`Blob`/circular refs at any depth), which is what `SectionDirtyTrackerService`
   * relies on; that property held even before this fix, only the evidence for it was wrong.
   */
  describe('UCA-OQ-2 — serializability of the tracked bodies', () => {
    it('round-trips a REALLY LOADED body with nested object regions/countries and a populated sub_national array, without loss', () => {
      const response = {
        geo_scope_id: GeoScopeEnum.SUB_NATIONAL,
        regions: [{ id: 7, name: 'Africa' }],
        countries: [
          {
            id: 1,
            iso_alpha_2: 'US',
            full_name: 'United States',
            sub_national: [{ code: 'US-CA', name: 'California', formatedName: '<strong>California</strong>' }]
          }
        ],
        has_regions: true,
        has_countries: true
      };
      jest.spyOn(mockApiService.resultsSE, 'GET_geographicSection').mockReturnValue(of({ response }));

      component.getSectionInformation();

      const loaded = {
        geographicLocationBody: component.geographicLocationBody,
        extraGeographicLocationBody: component.extraGeographicLocationBody
      };

      const roundTripped = JSON.parse(JSON.stringify(loaded));

      expect(roundTripped).toEqual(loaded);
    });
  });
});
