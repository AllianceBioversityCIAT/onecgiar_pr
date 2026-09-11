import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { FeedbackValidationDirective } from '../../../../../../shared/directives/feedback-validation.directive';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { signal } from '@angular/core';

jest.useFakeTimers();

describe('RdTheoryOfChangeComponent', () => {
  let component: RdTheoryOfChangeComponent;
  let fixture: ComponentFixture<RdTheoryOfChangeComponent>;
  let mockApiService: any;
  const mockGET_AllWithoutResultsResponse = [
    {
      id: 1,
      name: 'Initiative 1'
    }
  ];
  const mockGET_tocResponse = {
    contributing_and_primary_initiative: [
      {
        id: 1,
        official_code: 'code',
        short_name: 'name',
        initiative_name: 'initiative'
      }
    ],
    impactsTarge: [
      {
        name: 'name',
        target: 'target'
      }
    ],
    sdgTargets: [
      {
        sdg_target_code: 'code',
        sdg_target: 'target'
      }
    ],
    result_toc_result: {
      initiative_id: 1,
      result_toc_results: [
        {
          planned_result: true
        }
      ],
      planned_result: true
    },
    contributors_result_toc_result: [
      {
        initiative_id: 1,
        result_toc_results: [
          {
            planned_result: true
          }
        ]
      }
    ],
    contributing_center: [{ primary: false }, { primary: false }],
    contributing_initiatives: {
      accepted_contributing_initiatives: [
        {
          id: 1,
          short_name: 'name accepted',
          official_code: 'code-accepted'
        }
      ],
      pending_contributing_initiatives: [
        {
          id: 1,
          short_name: 'name pending',
          official_code: 'code-pending'
        }
      ]
    }
  };
  const mockGET_resultByIdResponse = {
    id: 1,
    portfolio: 'portfolio'
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllWithoutResults: () => of({ response: mockGET_AllWithoutResultsResponse }),
        GET_toc: () => of({ response: mockGET_tocResponse }),
        POST_toc: () => of({}),
        GET_TypeByResultLevel: () => of({ response: [{ id: 3, result_type: [{ id: 3 }] }] }),
        GET_AllCLARISACenters: () => of({ response: [] }),
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GET_resultById: () => of({ response: mockGET_resultByIdResponse })
      },
      alertsFe: {
        show: jest.fn().mockImplementationOnce((config, callback) => {
          callback();
        })
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Theory of change'),
        findClassTenSeconds: () => {
          return Promise.resolve(document.querySelector('alert-event'));
        }
      },
      rolesSE: {
        readOnly: () => false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdTheoryOfChangeComponent,
        SaveButtonComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent,
        AlertStatusComponent,
        DetailSectionTitleComponent,
        FeedbackValidationDirective
      ],
      imports: [HttpClientTestingModule, FormsModule, CustomFieldsModule, TermPipe],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdTheoryOfChangeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation(), and GET_AllWithoutResults() on initialization', async () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');
      const spyGET_AllWithoutResults = jest.spyOn(component, 'GET_AllWithoutResults');

      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div class="alert-event"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      component.ngOnInit();
      expect(spyGetSectionInformation).toHaveBeenCalled();
      expect(spyGET_AllWithoutResults).toHaveBeenCalled();
    });
  });

  describe('GET_AllWithoutResults()', () => {
    it('should fetch contributing initiatives on initialization', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_AllWithoutResults');

      component.GET_AllWithoutResults();

      expect(spy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.GET_AllWithoutResults).toHaveBeenCalled();
      expect(component.contributingInitiativesList).toEqual(mockGET_AllWithoutResultsResponse);
    });
  });

  describe('getSectionInformation()', () => {
    it('should update theoryOfChangeBody and related services correctly', async () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_toc');
      const mockSetTimeout = jest.spyOn(window, 'setTimeout');

      component.getSectionInformation(() => {
        expect(component.theoryOfChangeBody).toEqual(mockGET_tocResponse);
        expect(component.theoryOfChangeBody?.contributing_and_primary_initiative[0].full_name).toBe(`code - <strong>name</strong> - initiative`);
        expect(component.theoryOfChangeBody?.impactsTarge[0].full_name).toBe(`<strong>name</strong> - target`);
        expect(component.theoryOfChangeBody?.sdgTargets[0].full_name).toBe(`<strong>code</strong> - target`);
        expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockGET_tocResponse.result_toc_result);
        expect(component.theoryOfChangesServices.result_toc_result.planned_result).toEqual(
          mockGET_tocResponse.result_toc_result?.result_toc_results[0].planned_result
        );
        expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockGET_tocResponse.contributors_result_toc_result);
        expect(component.theoryOfChangesServices.contributors_result_toc_result[0].planned_result).toEqual(
          mockGET_tocResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result
        );
        expect(mockSetTimeout).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should update theoryOfChangeBody and related services correctly when theoryOfChangesServices.result_toc_result.planned_result and tab.result_toc_results[0].planned_result does not exist', async () => {
      mockGET_tocResponse.result_toc_result.result_toc_results[0].planned_result = undefined;
      mockGET_tocResponse.contributors_result_toc_result[0].result_toc_results[0].planned_result = undefined;

      const spy = jest.spyOn(mockApiService.resultsSE, 'GET_toc');

      component.getSectionInformation(() => {
        jest.runAllTimers();

        expect(component.theoryOfChangesServices.result_toc_result.planned_result).toBeNull();
        expect(component.theoryOfChangesServices.contributors_result_toc_result[0].planned_result).toBeNull();
        expect(component.theoryOfChangeBody?.contributing_and_primary_initiative[0].full_name).toBe(`code - <strong>name</strong> - initiative`);
        expect(component.theoryOfChangeBody?.impactsTarge[0].full_name).toBe(`<strong>name</strong> - target`);
        expect(component.theoryOfChangeBody?.sdgTargets[0].full_name).toBe(`<strong>code</strong> - target`);
        expect(component.theoryOfChangesServices.result_toc_result).toEqual(mockGET_tocResponse.result_toc_result);
        expect(component.theoryOfChangesServices.contributors_result_toc_result).toEqual(mockGET_tocResponse.contributors_result_toc_result);
        expect(spy).toHaveBeenCalled();
      });
    });

    it('should handle errors from GET_toc correctly', async () => {
      const errorMessage = 'error message';
      jest.spyOn(component.api.resultsSE, 'GET_toc').mockReturnValue(throwError(() => errorMessage));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      component.getSectionInformation();

      expect(consoleErrorSpy).toHaveBeenCalledWith(errorMessage);
      expect(component.getConsumed).toBeTruthy();
    });

    describe('sectionLoading (skeleton)', () => {
      it('starts raised so the empty TheoryOfChangeBody never paints as a filled-in-and-lost form', () => {
        const fresh = TestBed.createComponent(RdTheoryOfChangeComponent).componentInstance;

        expect(fresh.sectionLoading()).toBe(true);
      });

      it('is released once the section GET responds', () => {
        component.sectionLoading.set(true);

        component.getSectionInformation();

        expect(component.sectionLoading()).toBe(false);
      });

      it('is released when the section GET fails, so the skeleton can never get stuck', () => {
        component.sectionLoading.set(true);
        jest.spyOn(component.api.resultsSE, 'GET_toc').mockReturnValue(throwError(() => 'boom'));

        component.getSectionInformation();

        expect(component.sectionLoading()).toBe(false);
      });

      /**
       * The mask carries `inert`. If the release sat AFTER the response mapping, any exception in
       * that mapping (several accesses there are only half-guarded, `body?.x.y`) would leave the
       * section masked and permanently uneditable — worse than the half-filled but usable form the
       * same exception produced before the skeleton existed.
       */
      it('is released BEFORE the response mapping runs, so a mapping error cannot leave the section inert', () => {
        component.sectionLoading.set(true);
        let loadingWhileMapping: boolean | null = null;
        jest.spyOn(component.api.resultsSE, 'GET_toc').mockReturnValue(
          of({
            response: {
              // A getter is the first thing the mapping touches, so it samples the flag mid-mapping.
              get contributing_and_primary_initiative() {
                loadingWhileMapping = component.sectionLoading();
                return [];
              },
              result_toc_result: { result_toc_results: null, initiative_id: 1 },
              contributors_result_toc_result: [],
              contributing_initiatives: {}
            }
          } as any)
        );

        component.getSectionInformation();

        expect(loadingWhileMapping).toBe(false);
      });
    });

    it('should set getConsumed to true', () => {
      jest.useFakeTimers();
      jest.spyOn(component.api.resultsSE, 'GET_toc');

      component.getSectionInformation();

      jest.advanceTimersByTime(100);
      expect(component.getConsumed).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('onSaveSection()', () => {
    beforeEach(async () => {
      component.getSectionInformation();
    });

    it('should call POST_toc when official_code is different from newInitOfficialCode', () => {
      const spyPOST_toc = jest.spyOn(mockApiService.resultsSE, 'POST_toc').mockReturnValue(of({}));
      const spyShowAlert = jest.spyOn(mockApiService.alertsFe, 'show').mockImplementation((config, callback: () => any) => callback());

      component.theoryOfChangeBody.result_toc_result.official_code = 'oldCode';
      component.theoryOfChangeBody.changePrimaryInit = 2;
      component.theoryOfChangeBody.contributing_and_primary_initiative = [{ id: 2, official_code: 'newCode' }];

      component.onSaveSection();

      expect(spyShowAlert).toHaveBeenCalled();
      expect(spyPOST_toc).toHaveBeenCalled();
    });

    it('should call POST_toc when official_code is the same as newInitOfficialCode', () => {
      const spyPOST_toc = jest.spyOn(mockApiService.resultsSE, 'POST_toc').mockReturnValue(of({}));

      component.theoryOfChangeBody.result_toc_result.official_code = 'sameCode';
      component.theoryOfChangeBody.changePrimaryInit = 1;
      component.theoryOfChangeBody.contributing_and_primary_initiative = [{ id: 1, official_code: 'sameCode' }];

      component.onSaveSection();

      expect(spyPOST_toc).toHaveBeenCalled();
    });

    it('should filter out result_toc_results with null toc_result_id when length is greater than 1', () => {
      component.theoryOfChangeBody.result_toc_result.result_toc_results = [
        { toc_result_id: 1 },
        { toc_result_id: null },
        { toc_result_id: 2 }
      ] as any[];

      component.onSaveSection();

      expect(component.theoryOfChangeBody.result_toc_result.result_toc_results).toEqual([{ toc_result_id: 1 }, { toc_result_id: 2 }]);
    });

    it('should reload the page when initiative_id is different from changePrimaryInit', () => {
      const reloadMock = jest.fn();
      delete window.location;
      window.location = { ...window.location, reload: reloadMock } as any;

      component.theoryOfChangeBody.result_toc_result.initiative_id = 1;
      component.theoryOfChangeBody.changePrimaryInit = 2;

      component.onSaveSection();

      expect(reloadMock).toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('should call getSectionInformation when initiative_id is the same as changePrimaryInit', () => {
      const spyGetSectionInformation = jest.spyOn(component, 'getSectionInformation');

      component.theoryOfChangeBody.result_toc_result.initiative_id = 1;
      component.theoryOfChangeBody.changePrimaryInit = 1;

      component.onSaveSection();

      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('someEditable()', () => {
    it('should return true when .global-editable element is present', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div class="global-editable"></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = component.someEditable();

      expect(result).toBeTruthy();
    });

    it('should return false when .global-editable element is not present', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
      <div></div>`,
        'text/html'
      );

      jest.spyOn(document, 'querySelector').mockImplementation(selector => dom.querySelector(selector));

      const result = component.someEditable();

      expect(result).toBeFalsy();
    });
  });

  describe('onSelectContributingInitiative()', () => {
    it('should add contributors to contributors_result_toc_result when not found', async () => {
      component.getSectionInformation(() => {
        component.onSelectContributingInitiative();

        const expectedContributor = [
          {
            index: 0,
            initiative_id: 1,
            planned_result: null,
            result_toc_results: [
              {
                planned_result: undefined
              }
            ],
            showMultipleWPsContent: true
          },
          {
            action_area_outcome_id: null,
            id: null,
            initiative_id: 2,
            official_code: 'code',
            planned_result: null,
            result_toc_result_id: null,
            results_id: null,
            short_name: 'name',
            toc_level_id: null,
            toc_result_id: null
          }
        ];
        expect(component.theoryOfChangeBody.contributors_result_toc_result).toEqual(expectedContributor);
      });
    });
  });

  describe('toggleActiveContributor()', () => {
    it('should toggle the is_active property to true', () => {
      const item = { is_active: false };

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeTruthy();
    });

    it('should toggle the is_active property to false', () => {
      const item = { is_active: true };

      component.toggleActiveContributor(item);

      expect(item.is_active).toBeFalsy();
    });
  });

  describe('onRemoveContributingInitiative()', () => {
    it('should remove the contributor by initiative_id', () => {
      const contributor1 = { initiative_id: 1 };
      const contributor2 = { initiative_id: 2 };
      component.theoryOfChangeBody.contributors_result_toc_result = [contributor1, contributor2];

      component.onRemoveContributingInitiative({ remove: { id: 1 } });

      expect(component.theoryOfChangeBody.contributors_result_toc_result).toEqual([contributor2]);
    });

    it('should remove the contributing initiative and update the arrays', () => {
      component.theoryOfChangeBody = {
        contributors_result_toc_result: [
          { initiative_id: 1, name: 'Initiative 1' },
          { initiative_id: 2, name: 'Initiative 2' }
        ],
        contributing_and_primary_initiative: [
          { id: 1, name: 'Initiative 1' },
          { id: 2, name: 'Initiative 2' }
        ]
      } as any;

      const event = { remove: { id: 1 } };

      component.onRemoveContributingInitiative(event);

      expect(component.theoryOfChangeBody.contributors_result_toc_result.length).toBe(1);
      expect(component.theoryOfChangeBody.contributors_result_toc_result[0].initiative_id).toBe(2);

      expect(component.theoryOfChangeBody.contributing_and_primary_initiative.length).toBe(1);
      expect(component.theoryOfChangeBody.contributing_and_primary_initiative[0].id).toBe(2);
    });
  });

  describe('onRemoveNewContributing()', () => {
    it('should remove the contributing initiative by index', () => {
      component.contributingInitiativeNew = ['initiative1', 'initiative2', 'initiative3'];

      component.onRemoveNewContributing(1);

      expect(component.contributingInitiativeNew).toEqual(['initiative1', 'initiative3']);
    });
  });

  describe('onRemoveAcceptedContributing()', () => {
    it('should remove the contributing initiative by index from accepted_contributing_initiatives', () => {
      component.theoryOfChangeBody.contributing_initiatives.accepted_contributing_initiatives = ['initiative1', 'initiative2', 'initiative3'];

      component.onRemoveAcceptedContributing(1);

      expect(component.theoryOfChangeBody.contributing_initiatives.accepted_contributing_initiatives).toEqual(['initiative1', 'initiative3']);
    });
  });

  /**
   * `UCA-T-10` — `CanComponentDeactivate` wiring. `SectionDirtyTrackerService` is component-scoped
   * (`providers: [SectionDirtyTrackerService]`), so each spec gets a fresh instance via
   * `TestBed.createComponent` in the outer `beforeEach` — no cross-test snapshot leakage.
   *
   * Deliberately NOT reusing the file-level `mockGET_tocResponse` — several tests above mutate it
   * (or objects it shares references with, via `theoryOfChangeBody`'s in-place field assignment)
   * across the file's run order. The local `freshTocResponse()` factory below returns a brand-new
   * literal per call, same precedent as `UCA-T-6`'s rework.
   *
   * `jest.useFakeTimers()` is enabled file-wide (line 17); it is switched to real timers for the
   * duration of this describe block (`beforeEach`/`afterEach`) because Angular's `fakeAsync`/`tick()`
   * — required here to drive a genuinely async `GET_toc` (`delay(0)`) without masking a real race,
   * per `UCA-T-6`'s attempt-1 FAIL lesson — manages its own timer queue via zone.js and must not be
   * layered under Jest's modern fake timers.
   *
   * `getSectionInformation()`'s load flow (unlike `UCA-T-6`'s discontinued-options race) performs
   * every mutation to `theoryOfChangeBody` synchronously inside its single GET's `next` callback —
   * confirmed by reading the full method body, and by `GET_AllWithoutResults()` (`ngOnInit()`'s
   * other, independent call) only ever touching `contributingInitiativesList`. The `delay(0)` +
   * `fakeAsync`/`tick()` setup here is used anyway (not a synchronous mock) to guard against a
   * future regression silently reintroducing a similar race.
   */
  describe('CanComponentDeactivate (UCA-T-10)', () => {
    const freshTocResponse = () => ({
      contributing_and_primary_initiative: [{ id: 1, official_code: 'code', short_name: 'name', initiative_name: 'initiative' }],
      impactsTarge: [],
      sdgTargets: [],
      result_toc_result: {
        initiative_id: 1,
        official_code: 'code',
        result_toc_results: [{ planned_result: true, toc_result_id: 1 }]
      },
      contributors_result_toc_result: [],
      contributing_initiatives: {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: []
      }
    });

    beforeEach(() => {
      jest.useRealTimers();
      mockApiService.resultsSE.GET_toc = jest.fn(() => of({ response: freshTocResponse() }).pipe(delay(0)));
      mockApiService.resultsSE.POST_toc = jest.fn(() => of({}));
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('is false right after the load flow genuinely completes', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    /**
     * Falsifying input: snapshotting `theoryOfChangeBody` only once (at load) and never again
     * after save would make this true right after load-then-edit, which is correct here — but
     * combined with the next test proves the save-branch snapshot never resets the baseline.
     */
    it('is true after editing a bound field', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      component.theoryOfChangeBody.impactsTarge.push({ name: 'Edited', target: 'target' });

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    /**
     * Falsifying input: snapshotting `theoryOfChangeBody` only once (at load) and never again
     * after a successful save would report `true` here. `changePrimaryInit` is deliberately left
     * equal to `result_toc_result.initiative_id` throughout (the edit below touches `impactsTarge`
     * instead) so `performSave()`'s `tap` takes its `getSectionInformation()` branch, not
     * `location.reload()` — that follow-up reload is then forced to FAIL entirely, so this test
     * can only pass because of the DIRECT `dirtyTracker.snapshot(...)` call inside `performSave()`'s
     * `tap`, not the reload's own re-snapshot.
     */
    it('is false right when saveSection() emits true, even when the follow-up reload fails entirely', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      component.theoryOfChangeBody.impactsTarge.push({ name: 'Edited', target: 'target' });
      expect(component.hasUnsavedChanges()).toBe(true);

      mockApiService.resultsSE.GET_toc.mockReturnValue(throwError(() => new Error('reload failed')));

      let sawTrue = false;
      component.saveSection().subscribe(result => {
        sawTrue = result === true;
        expect(component.hasUnsavedChanges()).toBe(false);
      });
      tick();

      expect(sawTrue).toBe(true);
    }));

    /**
     * Falsifying input: letting the underlying HTTP error propagate as an unhandled observable
     * error (instead of resolving `false`) would break `UnsavedChangesGuard`'s subscribe chain
     * rather than cleanly blocking navigation.
     */
    it('saveSection() resolves false (not throws) on a failing POST_toc, without reloading the section', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      const reloadSpy = jest.spyOn(component, 'getSectionInformation');
      mockApiService.resultsSE.POST_toc.mockReturnValue(throwError(() => new Error('save failed')));

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

    /**
     * `UCA-T-10` Issue 2 (rework attempt 2, real bug) — a freshly loaded, untouched `planned_result:
     * true` ToC with a non-empty `result_toc_results` must stay non-dirty even after the rendered
     * child subtree decorates the tracked row. This simulates the EXACT writes
     * `MultipleWPsComponent.ngOnChanges()` and `MultipleWPsContentComponent.getIndicator()` perform
     * (verbatim field names, read from their source), directly on the loaded object, rather than
     * rendering the real child tree (this spec declares no `toc-initiative-out`/`multiple-wps`
     * components — `NO_ERRORS_SCHEMA` is not even in use here, so those selectors would error).
     *
     * Falsifying input: a fix that only strips `uniqueId` (and not `indicators`/`impactAreasTargets`/
     * `sdgTargest`/`actionAreaOutcome`/`is_sdg_action_impact`/`wpinformation`) would still fail this
     * test — every one of those fields is asserted together. Self-verified by reverting
     * `dirtySnapshotValue()`'s normalization to a passthrough: this test then fails (`true`, not
     * `false`), confirming it exercises the real bug and is not vacuous.
     */
    it('is false after the rendered child subtree decorates the tracked ToC row (Issue 2)', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      // Simulate `MultipleWPsComponent.ngOnChanges()` — stamps a fresh random key on EVERY row.
      component.theoryOfChangeBody.result_toc_result.result_toc_results.forEach((tab: any) => {
        tab.uniqueId = Math.random().toString(36).substring(7);
      });

      // Simulate `MultipleWPsContentComponent.getIndicator()` — writes onto `activeTab`
      // (`result_toc_results[0]`) once its async call resolves.
      const activeTab: any = component.theoryOfChangeBody.result_toc_result.result_toc_results[0];
      activeTab.indicators = [{ id: 1 }];
      activeTab.impactAreasTargets = [{ id: 2, full_name: '<strong>a</strong> - b' }];
      activeTab.sdgTargest = [{ id: 3, full_name: '<strong>c</strong> - d' }];
      activeTab.actionAreaOutcome = [{ id: 4, full_name: '<strong>Genetic Innovation</strong> (E) - F' }];
      activeTab.is_sdg_action_impact = true;
      activeTab.wpinformation = { wpTitle: '<strong>title</strong>' };

      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    /**
     * `UCA-T-10` Issue 4 (rework attempt 2, real bug) — reached via `saveSection()` (the guard's
     * silent Back/Next save, or the dialog's Save), a changed primary submitter must NOT call
     * `location.reload()`: that would reload the CURRENT url mid-navigation and strand the user
     * off the section they clicked, since `saveSection()` deliberately bypasses the confirmation
     * dialog that would otherwise warn them. `getSectionInformation()` must be taken instead.
     *
     * Falsifying input: a `performSave()` that still branches on `initiative_id !== changePrimaryInit`
     * regardless of caller would call `location.reload()` here, exactly as it did before the fix.
     * Self-verified by reverting the `viaGuard` suppression in `performSave()`: this test then fails
     * (`reloadMock` IS called).
     */
    it('does NOT call location.reload() from saveSection(), even with a changed primary submitter (Issue 4)', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      const reloadMock = jest.fn();
      delete (window as any).location;
      window.location = { ...window.location, reload: reloadMock } as any;

      component.theoryOfChangeBody.changePrimaryInit = component.theoryOfChangeBody.result_toc_result.initiative_id + 1;

      let sawTrue = false;
      component.saveSection().subscribe(result => (sawTrue = result === true));
      tick();

      expect(reloadMock).not.toHaveBeenCalled();
      expect(sawTrue).toBe(true);
    }));

    /**
     * Confirms the manual Save path's existing/intended behavior is untouched by Issue 4's fix:
     * `onSaveSection()` still reloads on a changed primary submitter (the user was already warned
     * via the confirmation dialog in that path — see the `onSaveSection()` describe block above,
     * which covers this same case without `viaGuard`).
     */
    it('onSaveSection() (manual path) still calls location.reload() on a changed primary submitter', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      const reloadMock = jest.fn();
      delete (window as any).location;
      window.location = { ...window.location, reload: reloadMock } as any;

      component.theoryOfChangeBody.result_toc_result.official_code = 'code';
      component.theoryOfChangeBody.changePrimaryInit = component.theoryOfChangeBody.result_toc_result.initiative_id + 1;
      component.theoryOfChangeBody.contributing_and_primary_initiative = [{ id: component.theoryOfChangeBody.changePrimaryInit, official_code: 'code' }];

      component.onSaveSection();
      tick();

      expect(reloadMock).toHaveBeenCalled();
    }));
  });
});
