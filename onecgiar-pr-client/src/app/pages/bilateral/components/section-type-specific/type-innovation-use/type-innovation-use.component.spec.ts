import { readFileSync } from 'fs';
import { join } from 'path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { TypeInnovationUseComponent } from './type-innovation-use.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { QaInnovationDevelopmentResultsService } from '../../../../../shared/services/global/qa-innovation-development-results.service';

describe('TypeInnovationUseComponent', () => {
  let fixture: ComponentFixture<TypeInnovationUseComponent>;
  let component: TypeInnovationUseComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let innovationControlListSE: any;
  let qaInnovationsSE: any;

  /**
   * P2-3556 — `build()` now RUNS the first change detection, so `ngOnInit` fires and the default
   * `GET_innovationUse` mock (which resolves synchronously) leaves the component `loaded`.
   *
   * Before the fix it did not, and that was a hole in this spec rather than a detail: `ngOnInit` never
   * ran, so every save assertion below was exercising a component that had never initialized. With the
   * load gate in place those assertions would all have passed for the WRONG reason — `schedulePayload`
   * called with a body the test had assigned by hand, on a component that could not legally save at
   * all. The sibling sections had the same hole (`6e88e275b`, `1fef02f2a`).
   */
  const build = () => {
    fixture = TestBed.createComponent(TypeInnovationUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  beforeEach(async () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = {
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn(),
      // Which section the editor is showing. The component re-reads its investment tables on the
      // transition INTO this one, because the sections are all mounted at once behind `[hidden]`
      // and its own `ngOnInit` fetch never runs again.
      openSection: signal<string | null>(null)
    };
    creation = { currentResultId: signal<number | null>(123), reportingYear: signal<number | null>(2026) };
    expandableState = {
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn()
    };
    // Mirrors `GET /v2/clarisa/innovation-use-levels`: `id` is what the form stores, `level` is the number
    // the scaling-studies and explanation gates read.
    innovationControlListSE = {
      useLevelsList: [
        { id: '1', level: 0, name: 'No use' },
        { id: '4', level: 3, name: 'Level 3' },
        { id: '6', level: 5, name: 'Level 5' },
        { id: '7', level: 6, name: 'Level 6' }
      ]
    };
    qaInnovationsSE = { options: signal([]), load: jest.fn() };
    bilateralApi = {
      GET_actorsTypes: jest.fn().mockReturnValue(of({ response: [{ actor_type_id: 1, name: 'Farmer' }] })),
      GET_institutionsTypeTree: jest.fn().mockReturnValue(
        of({
          response: [
            { code: 10, name: 'Government', childrens: [{ code: 11, name: 'Ministry' }] },
            { code: 20, name: 'Private sector', childrens: [] }
          ]
        })
      ),
      GET_innovationUse: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_innovationUse: jest.fn().mockReturnValue(of({}))
    };

    await TestBed.configureTestingModule({
      imports: [TypeInnovationUseComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: InnovationControlListService, useValue: innovationControlListSE },
        { provide: QaInnovationDevelopmentResultsService, useValue: qaInnovationsSE }
      ]
    })
      .overrideTemplate(TypeInnovationUseComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  /**
   * The sections are siblings under `[hidden]`, all mounted once with the page, so this one's
   * `ngOnInit` fetch is a snapshot of the moment the result opened. A project added afterwards in
   * `section-contributors` never reached the investment table, could never be given an amount or
   * "yet to be determined", and submit-for-review then refused the result over a row the form was
   * showing as done (result code 9506, AfricaRice, 21-Sep-2026).
   */
  describe('investment tables refresh on entering the section', () => {
    const openSection = (name: string | null) => {
      autoSave.openSection.set(name);
      fixture.detectChanges();
    };

    it('picks up a project linked after the section was first loaded, keeping unsaved edits', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { investment_bilateral: [{ project_id: 1954, name: 'Rice Scaling', kind_cash: null, is_determined: null }] } })
      );
      build();
      openSection('general-info');

      // The reporter types an amount without saving, then a second project is linked elsewhere.
      component.body.investment_bilateral[0].kind_cash = 5000;
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({
          response: {
            investment_bilateral: [
              { project_id: 1954, name: 'Rice Scaling', kind_cash: null, is_determined: null },
              { project_id: 1410, name: 'Delta Agronomy', kind_cash: null, is_determined: null }
            ]
          }
        })
      );
      openSection('type-specific');

      expect(component.body.investment_bilateral).toHaveLength(2);
      expect(component.body.investment_bilateral[0].kind_cash).toBe(5000);
      expect(component.body.investment_bilateral[1].name).toBe('Delta Agronomy');
    });

    it('does not re-fetch while the section simply stays open', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { investment_bilateral: [] } }));
      build();
      openSection('type-specific');
      const afterEntering = bilateralApi.GET_innovationUse.mock.calls.length;

      fixture.detectChanges();

      expect(bilateralApi.GET_innovationUse).toHaveBeenCalledTimes(afterEntering);
    });
  });

  describe('loadData', () => {
    it('loads the body and the actor types catalog', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { innov_use_to_be_determined: false, innovation_use_level_id: 5 } }));
      build();
      fixture.detectChanges();
      expect(component.body.innov_use_to_be_determined).toBe(false);
      expect(component.actorsTypeList).toEqual([{ actor_type_id: 1, name: 'Farmer' }]);
    });

    it('restores the show-all-fields toggle from the expandable state service', () => {
      expandableState.getShowAllFields.mockReturnValue(true);
      build();
      fixture.detectChanges();
      expect(expandableState.getShowAllFields).toHaveBeenCalledWith(123, 'type-specific');
      expect(component.showAllFields()).toBe(true);
    });

    it('falls back to resultId 0 when there is no current result yet', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(expandableState.getShowAllFields).toHaveBeenCalledWith(0, 'type-specific');
    });

    it('still loads the actor types catalog even without a current result', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_actorsTypes).toHaveBeenCalled();
      expect(bilateralApi.GET_innovationUse).not.toHaveBeenCalled();
    });

    it('falls back to empty defaults when the responses are empty', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: null }));
      bilateralApi.GET_actorsTypes.mockReturnValue(of({ response: null }));
      bilateralApi.GET_institutionsTypeTree.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      // P2-3390 — `hydrateInvestmentTables` guarantees the three arrays exist before the shared table
      // component renders, so an empty response is `{}` plus those three empty arrays.
      expect(component.body).toEqual({
        investment_programs: [],
        investment_bilateral: [],
        investment_partners: []
      });
      expect(component.actorsTypeList).toEqual([]);
      expect(component.institutionsTypeTreeList).toEqual([]);
    });

    it('loads the institution type tree catalog', () => {
      build();
      fixture.detectChanges();
      expect(component.institutionsTypeTreeList).toEqual([
        { code: 10, name: 'Government', childrens: [{ code: 11, name: 'Ministry' }] },
        { code: 20, name: 'Private sector', childrens: [] }
      ]);
    });

    it('splits a hydrated parent_institution_type_id back into a parent/sub-type pair', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { organization: [{ institution_types_id: 11, parent_institution_type_id: 10 }] } })
      );
      build();
      fixture.detectChanges();
      expect(component.body.organization[0]).toMatchObject({ institution_types_id: 10, institution_sub_type_id: 11 });
    });

    it('marks the section as loaded once the body is in hand', () => {
      build();
      expect(component.loaded()).toBe(true);
    });

    /**
     * P2-3556 — the data-loss chain, cut at its root.
     *
     * `loadData()` had no error handler, and the interceptor rethrows every failed response
     * (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran and `body`
     * stayed the `{}` it was constructed with. The form painted blank with no warning and the first
     * keystroke autosaved `buildPayload()`'s `?? null` / `?? []` over the stored record: the use level
     * and the "to be determined" answer are written as `?? null`
     * (`api/results/summary/summary.service.ts:104-106`, `:121-123`), the four optional columns are
     * written whenever the key is present and it always is (`:185-201`), and `scaling_studies_urls: []`
     * de-activates every stored study link (`:228-245`).
     *
     * These assert on the ABSENCE of a request, which is the only thing that distinguishes the fix from
     * the defect: the old code reached `schedulePayload` on every one of these paths, and a failure here
     * prints the wipe payload itself.
     */
    describe('when the GET fails (P2-3556)', () => {
      const failLoad = () => bilateralApi.GET_innovationUse.mockReturnValue(throwError(() => new Error('HTTP 500')));

      it('leaves the section not loaded, with an empty body', () => {
        failLoad();
        build();
        expect(component.loaded()).toBe(false);
        expect(component.body).toEqual({});
      });

      it('sends NOTHING when the person types on a form that never loaded', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();

        component.body.readiness_level_explanation = 'typed by the user';
        component.onFieldChange();

        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      it('sends nothing when the person presses Save either', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();
        component.onSave();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      // Every list/cascade handler funnels into `onFieldChange`, so the choke point covers them all —
      // but they are the paths a user reaches by clicking rather than typing, and the ones a future
      // refactor is most likely to wire straight to `schedulePayload`. Pinned one by one.
      it.each([
        ['addActor', (c: any) => c.addActor()],
        ['deleteActor', (c: any) => c.deleteActor(c.body.actors[0])],
        ['onDisaggregationChange', (c: any) => c.onDisaggregationChange(c.body.actors[0])],
        ['addOrganization', (c: any) => c.addOrganization()],
        ['deleteOrganization', (c: any) => c.deleteOrganization(c.body.organization[0])],
        ['onOrganizationTypeChange', (c: any) => c.onOrganizationTypeChange(c.body.organization[0])],
        ['addMeasure', (c: any) => c.addMeasure()],
        ['deleteMeasure', (c: any) => c.deleteMeasure(c.body.measures[0])],
        ['addStudyLink', (c: any) => c.addStudyLink()],
        ['deleteStudyLink', (c: any) => c.deleteStudyLink(0)],
        ['onInnovationLinkChange', (c: any) => c.onInnovationLinkChange()],
        ['onUseLevelChange', (c: any) => c.onUseLevelChange()]
      ])('sends nothing from %s either', (_name, act) => {
        failLoad();
        build();
        component.body = {
          actors: [{ actor_type_id: 1, is_active: true }],
          organization: [{ institution_types_id: 10, is_active: true }],
          measures: [{ unit_of_measure: 'ha', quantity: 3, is_active: true }],
          scaling_studies_urls: ['https://example.org']
        };
        autoSave.schedulePayload.mockClear();

        act(component);

        expect(autoSave.schedulePayload).not.toHaveBeenCalled();
      });

      // Same reason as the sibling section (P2-3355): publishing no checklist at all leaves the section
      // at "0/0 fields", which reads as "nothing required here" instead of as incomplete.
      it('still publishes the three unfilled MDS items, so the section stays honestly incomplete', () => {
        failLoad();
        build();
        const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
        expect(fields.map((f: any) => f.key)).toEqual(['use-actors', 'use-measures', 'use-investment']);
        expect(fields.every((f: any) => f.filled === false)).toBe(true);
      });
    });

    /**
     * P2-3556, the secondary window: `GET summary/innovation-use/get/result/:id` takes 94-159 ms on
     * prtest (measured 2-Sep-2026) against an 800 ms autosave debounce, so an edit could reach the PATCH
     * before the body ever arrived — and a payload built from `{}` blanks the record exactly as a failed
     * load does. `null` therefore blocks too.
     */
    describe('while the GET is still in flight (P2-3556)', () => {
      it('sends nothing before the body arrives, and saves normally afterwards', () => {
        const inFlight = new Subject<any>();
        bilateralApi.GET_innovationUse.mockReturnValue(inFlight.asObservable());
        build();

        expect(component.loaded()).toBeNull();
        component.body.readiness_level_explanation = 'typed too early';
        component.onFieldChange();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();

        inFlight.next({ response: { innovation_use_level_id: 4, readiness_level_explanation: 'stored' } });
        expect(component.loaded()).toBe(true);

        component.onFieldChange();
        expect(autoSave.schedulePayload).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * P2-3556 — the person must be TOLD. Before this, a failed load painted an ordinary empty form:
     * indistinguishable from a result nobody had filled in yet, which is what made them start typing
     * over a record they could not see. The template is `overrideTemplate`d in this spec, so it is
     * asserted as text — same approach as the `Coming soon` investment test below.
     */
    describe('what the failed load looks like on screen (P2-3556)', () => {
      const html = () => readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');

      it('renders the error alert only when the load actually failed', () => {
        const banner = html();
        expect(banner).toContain('@if (loaded() === false) {');
        expect(banner).toContain('<app-alert-status status="error" [description]="loadErrorNote">');
        // A naive `@if (!loaded())` would flash the error on every open while the GET is merely in
        // flight, and this endpoint has no 404 "no row yet" state to confuse it with.
        expect(banner).not.toContain('@if (!loaded())');
      });

      it('tells the person the two things that matter: nothing is saved, nothing was lost', () => {
        const note = build().loadErrorNote;
        expect(note).toContain('nothing typed here will be saved');
        expect(note).toContain('reported earlier has not been changed');
      });

      // Explicit-save model (2026-09-03): no in-section Save; the footer's Save draft persists it.
      it('renders no in-section Save button', () => {
        expect(html()).not.toContain('(click)="onSave()"');
      });
    });

    it('leaves a top-level-only organization untouched', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { organization: [{ institution_types_id: 20 }] } }));
      build();
      fixture.detectChanges();
      expect(component.body.organization[0]).toEqual({ institution_types_id: 20 });
    });
  });

  describe('visibleActors', () => {
    it('excludes soft-deleted actors', () => {
      build();
      component.body = {
        actors: [{ actor_type_id: 1, is_active: true }, { actor_type_id: 2, is_active: false }, { actor_type_id: 3 }]
      };
      expect(component.visibleActors).toEqual([{ actor_type_id: 1, is_active: true }, { actor_type_id: 3 }]);
    });

    it('is empty when there are no actors yet', () => {
      build();
      component.body = {};
      expect(component.visibleActors).toEqual([]);
    });
  });

  describe('actor list management', () => {
    it('adds a new actor, initializing the array if absent', () => {
      build();
      component.body = {};
      component.addActor();
      expect(component.body.actors).toEqual([{ actor_type_id: null, sex_and_age_disaggregation: false, is_active: true }]);
    });

    it('soft-deletes an actor instead of removing it from the array', () => {
      build();
      const actor = { actor_type_id: 1, is_active: true };
      component.body = { actors: [actor] };
      component.deleteActor(actor);
      expect(component.body.actors).toEqual([{ actor_type_id: 1, is_active: false }]);
      expect(component.visibleActors).toEqual([]);
    });

    it('clears every count field when "does not apply" is ticked', () => {
      build();
      const actor = { sex_and_age_disaggregation: true, women: 1, women_youth: 2, men: 3, men_youth: 4, how_many: 5 };
      component.onDisaggregationChange(actor);
      expect(actor).toMatchObject({ women: null, women_youth: null, men: null, men_youth: null, how_many: null });
    });

    it('also clears the age-only fallback when "does not apply" is ticked, as the pooled cleanActor does', () => {
      build();
      const actor = { sex_and_age_disaggregation: true, women: 4, age_disaggregation_not_available: true, youth_split_applied_by_system: true };
      component.onDisaggregationChange(actor);
      expect(actor).toMatchObject({ age_disaggregation_not_available: null, youth_split_applied_by_system: null });
    });

    it('keeps the stored breakdown when "does not apply" is unticked (rows saved under the old Yes/No)', () => {
      build();
      const actor: any = { sex_and_age_disaggregation: false, women: 40, women_youth: 10, men: 60, men_youth: 15, how_many: null };
      component.onDisaggregationChange(actor);
      expect(actor).toMatchObject({ women: 40, women_youth: 10, men: 60, men_youth: 15, how_many: 100 });
    });

    it('triggers autosave on add and delete', () => {
      build();
      component.body = { actors: [{ actor_type_id: 1, is_active: true }] };
      autoSave.schedulePayload.mockClear();
      component.addActor();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
      autoSave.schedulePayload.mockClear();
      component.deleteActor(component.body.actors[0]);
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  /**
   * P2-3428 — the 2030 Use Projection, mirroring W1/W2 (P2-3295) but optional: it lives in full metadata
   * and is never published to the MDS tracker. Stored server-side under `section_id = 2`.
   */
  describe('2030 Use Projection (P2-3428)', () => {
    const html = () => readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');

    it('shows the W1/W2 title, guidance note, question and tooltip from the shared copy', () => {
      const t = html();
      expect(t).toContain('[label]="projection2030Copy.title"');
      expect(t).toContain('[description]="projection2030Copy.guidance"');
      expect(t).toContain('[label]="projection2030Copy.question"');
      expect(t).toContain('[tooltip]="projection2030Copy.tooltip"');
      const copy = build().projection2030Copy;
      expect(copy.title).toBe('2030 Use Projection');
      expect(copy.question).toBe('What is the projected innovation use by end of 2030?');
      expect(copy.guidance).toContain('href="https://docs.google.com/document/d/1mkt4bS51CyGmHKfkvuonAiJhkl4n-mLE/"');
      expect(copy.guidance).toContain("United Nations definition of 'youth'");
    });

    it('offers Actors, Organizations and Other quantitative measures with the W1/W2 buttons, none required', () => {
      const t = html();
      const block = t.slice(t.indexOf('[label]="projection2030Copy.title"'), t.indexOf('P2-3424 — optional, not MDS'));
      expect(block).toContain('name="Add actor"');
      expect(block).toContain('name="Add organization"');
      expect(block).toContain('name="Add other"');
      expect(block).not.toContain('[required]="true"');
      expect(block).toContain('context: { $implicit: actor, required: false }');
      expect(t).toContain('@if (showProjection2030Lists) {');
    });

    it('hides the three lists while the 2030 use is yet to be determined', () => {
      build();
      component.body = { innov_use_2030_to_be_determined: true };
      expect(component.showProjection2030Lists).toBe(false);
      component.body = { innov_use_2030_to_be_determined: null };
      expect(component.showProjection2030Lists).toBe(true);
    });

    it('adds rows to the projection, not to current use', () => {
      build();
      component.body = { actors: [], organization: [], measures: [] };
      component.addProjection2030Actor();
      component.addProjection2030Organization();
      component.addProjection2030Measure();
      expect(component.body.actors).toEqual([]);
      expect(component.body.organization).toEqual([]);
      expect(component.body.measures).toEqual([]);
      expect(component.body.innovation_use_2030.actors).toEqual([
        { actor_type_id: null, sex_and_age_disaggregation: false, is_active: true }
      ]);
      expect(component.body.innovation_use_2030.organization).toHaveLength(1);
      expect(component.body.innovation_use_2030.measures).toHaveLength(1);
    });

    it('sends the projection lists, with sub-types flattened, next to the current ones', () => {
      build();
      component.body = {
        innovation_use_2030: {
          actors: [{ actor_type_id: 1, women: 20 }],
          organization: [{ institution_types_id: 3, institution_sub_type_id: 31 }],
          measures: [{ unit_of_measure: 'hectares', quantity: 900 }]
        }
      };
      const payload: any = (component as any).buildPayload();
      expect(payload.innovation_use_2030).toEqual({
        actors: [{ actor_type_id: 1, women: 20 }],
        organization: [{ institution_types_id: 31 }],
        measures: [{ unit_of_measure: 'hectares', quantity: 900 }]
      });
    });

    it('reloads the projection with its sub-types split back out and its flags as booleans', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({
          response: {
            innovation_use_2030: {
              actors: [{ actor_type_id: 1, sex_and_age_disaggregation: 0 }],
              organization: [{ institution_types_id: 31, parent_institution_type_id: 3 }],
              measures: []
            }
          }
        })
      );
      build();
      expect(component.body.innovation_use_2030.actors[0].sex_and_age_disaggregation).toBe(false);
      expect(component.body.innovation_use_2030.organization[0]).toMatchObject({ institution_types_id: 3, institution_sub_type_id: 31 });
    });

    it('never moves the green check: the projection is not an MDS item', () => {
      build();
      component.body = {
        innov_use_to_be_determined: false,
        innovation_use_2030: { actors: [{ actor_type_id: 1 }], organization: [], measures: [{ unit_of_measure: 'ha', quantity: 5 }] }
      };
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.find((f: any) => f.key === 'use-actors').filled).toBe(false);
      expect(fields.find((f: any) => f.key === 'use-measures').filled).toBe(false);
    });
  });

  /**
   * P2-3785 (4b) — gender and youth set up as for pooled. The W1/W2 form (and every server reader:
   * `innovation-use.handler.ts`, the quality-assessment mapper, the outbound summary) reads
   * `sex_and_age_disaggregation = true` as "the breakdown does NOT apply". The bilateral Yes/No saved
   * "Yes, available" as that same `true`, so a reported breakdown was stored as its absence.
   */
  describe('gender and youth as in pooled (P2-3785 4b)', () => {
    const html = () => readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');

    it('asks the pooled question with the pooled meaning: ticked hides the breakdown', () => {
      const t = html();
      expect(t).not.toContain('Sex and age disaggregated data available?');
      expect(t).toContain('label="Sex and age disaggregation does not apply"');
      expect(t).toContain('@if (!actor.sex_and_age_disaggregation) {');
      expect(t).toContain('label="Age disaggregation not available"');
      expect(t).toContain('label="Non-youth"');
      expect(t).toContain('label="Total"');
    });

    it('derives Non-youth and the Total the reporter can read', () => {
      build();
      const actor = { women: 40, women_youth: 10, men: 60, men_youth: 15 };
      expect(component.nonYouth(actor, 'women')).toBe(30);
      expect(component.nonYouth(actor, 'men')).toBe(45);
      expect(component.actorTotal(actor)).toBe(100);
    });

    it('shows nothing instead of a fake zero while no figure was entered', () => {
      build();
      expect(component.nonYouth({}, 'women')).toBeNull();
      expect(component.actorTotal({})).toBeNull();
      expect(component.actorTotal({ women: '7' })).toBe(7);
    });

    it('keeps how_many equal to Women + Men while the breakdown applies', () => {
      build();
      const actor: any = { sex_and_age_disaggregation: false, women: 40, men: 60 };
      component.onGenderChange(actor);
      expect(actor.how_many).toBe(100);
    });

    it('never overwrites how_many when disaggregation does not apply', () => {
      build();
      const actor: any = { sex_and_age_disaggregation: true, how_many: 12 };
      component.onGenderChange(actor);
      expect(actor.how_many).toBe(12);
    });

    it('does not let Youth exceed the total of its group', () => {
      build();
      const actor: any = { women: 10, women_youth: 25 };
      expect(component.youthExceeds(actor, 'women')).toBe(true);
      component.onYouthChange(actor, 'women');
      expect(actor.women_youth).toBe(10);
      expect(component.youthExceeds(actor, 'women')).toBe(false);
    });

    it('splits youth 50/50 and stamps it when age disaggregation is not available, and undoes it on untick', () => {
      build();
      const actor: any = { women: 9, men: 4, age_disaggregation_not_available: true };
      component.onAgeFallbackChange(actor);
      expect(actor).toMatchObject({ women_youth: 5, men_youth: 2, youth_split_applied_by_system: true, how_many: 13 });

      actor.men = 10;
      component.onGenderChange(actor);
      expect(actor.men_youth).toBe(5);

      actor.age_disaggregation_not_available = false;
      component.onAgeFallbackChange(actor);
      expect(actor).toMatchObject({ women_youth: null, men_youth: null, youth_split_applied_by_system: null });
    });

    it('reloads the stored tinyint flags as booleans so the checkboxes paint them', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({
          response: {
            actors: [
              { actor_type_id: 1, sex_and_age_disaggregation: 1, age_disaggregation_not_available: 0, youth_split_applied_by_system: null }
            ]
          }
        })
      );
      build();
      expect(component.body.actors[0]).toMatchObject({
        sex_and_age_disaggregation: true,
        age_disaggregation_not_available: false,
        youth_split_applied_by_system: null
      });
    });

    it('sends the fallback flags with the actor, so the server can persist them', () => {
      build();
      component.body = { actors: [{ actor_type_id: 1, women: 2, age_disaggregation_not_available: true }] };
      const payload: any = (component as any).buildPayload();
      expect(payload.innovatonUse.actors[0].age_disaggregation_not_available).toBe(true);
    });
  });

  describe('visibleOrganizations / visibleMeasures', () => {
    it('exclude soft-deleted rows and tolerate an absent array', () => {
      build();
      component.body = {
        organization: [
          { institution_types_id: 1, is_active: true },
          { institution_types_id: 2, is_active: false }
        ]
      };
      expect(component.visibleOrganizations).toEqual([{ institution_types_id: 1, is_active: true }]);
      component.body = {};
      expect(component.visibleOrganizations).toEqual([]);

      component.body = {
        measures: [
          { unit_of_measure: 'ha', is_active: true },
          { unit_of_measure: 'kg', is_active: false }
        ]
      };
      expect(component.visibleMeasures).toEqual([{ unit_of_measure: 'ha', is_active: true }]);
      component.body = {};
      expect(component.visibleMeasures).toEqual([]);
    });
  });

  describe('getInstitutionsTypeTreeChildren', () => {
    it('returns the matching parent node children', () => {
      build();
      fixture.detectChanges();
      expect(component.getInstitutionsTypeTreeChildren(10)).toEqual([{ code: 11, name: 'Ministry' }]);
    });

    it('returns an empty array for a leaf/unknown code', () => {
      build();
      fixture.detectChanges();
      expect(component.getInstitutionsTypeTreeChildren(20)).toEqual([]);
      expect(component.getInstitutionsTypeTreeChildren(999)).toEqual([]);
    });

    it('caches the lookup instead of re-scanning the list every call', () => {
      build();
      fixture.detectChanges();
      const first = component.getInstitutionsTypeTreeChildren(10);
      const findSpy = jest.spyOn(component.institutionsTypeTreeList, 'find');
      const second = component.getInstitutionsTypeTreeChildren(10);
      expect(second).toBe(first);
      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('organization list management', () => {
    it('adds a new organization, initializing the array if absent', () => {
      build();
      component.body = {};
      component.addOrganization();
      expect(component.body.organization).toEqual([{ institution_types_id: null, is_active: true }]);
    });

    it('soft-deletes an organization instead of removing it from the array', () => {
      build();
      const organization = { institution_types_id: 1, is_active: true };
      component.body = { organization: [organization] };
      component.deleteOrganization(organization);
      expect(component.body.organization).toEqual([{ institution_types_id: 1, is_active: false }]);
      expect(component.visibleOrganizations).toEqual([]);
    });

    it('resets the sub-type when the top-level type changes', () => {
      build();
      const organization = { institution_types_id: 10, institution_sub_type_id: 11 };
      component.onOrganizationTypeChange(organization);
      expect(organization.institution_sub_type_id).toBeNull();
    });

    it('triggers autosave on add and delete', () => {
      build();
      component.body = { organization: [{ institution_types_id: 1, is_active: true }] };
      autoSave.schedulePayload.mockClear();
      component.addOrganization();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
      autoSave.schedulePayload.mockClear();
      component.deleteOrganization(component.body.organization[0]);
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('measure list management', () => {
    it('adds a new measure, initializing the array if absent', () => {
      build();
      component.body = {};
      component.addMeasure();
      expect(component.body.measures).toEqual([{ is_active: true }]);
    });

    it('soft-deletes a measure instead of removing it from the array', () => {
      build();
      const measure = { unit_of_measure: 'ha', is_active: true };
      component.body = { measures: [measure] };
      component.deleteMeasure(measure);
      expect(component.body.measures).toEqual([{ unit_of_measure: 'ha', is_active: false }]);
      expect(component.visibleMeasures).toEqual([]);
    });
  });

  describe('updateMds — P2-3428 / P2-3331 AC1: the MDS fields published to the tracker', () => {
    const ACTORS = {
      key: 'use-actors',
      label: 'Actors'
    };
    const MEASURES = {
      key: 'use-measures',
      label: 'Other quantitative measures of innovation use'
    };
    const INVESTMENT = {
      key: 'use-investment',
      label: 'Investment by CGIAR W3 or bilateral projects'
    };

    const lastFields = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1];

    it('declares the published MDS fields and nothing else, all empty on a blank section', () => {
      build();
      component.body = {};
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { ...ACTORS, filled: false },
        { ...MEASURES, filled: false },
        { ...INVESTMENT, filled: false }
      ]);
    });

    it('no longer declares the old use-determined entry', () => {
      build();
      component.body = { innov_use_to_be_determined: true };
      component.updateMds();
      expect(lastFields().map((f: any) => f.key)).toEqual(['use-actors', 'use-measures', 'use-investment']);
    });

    it('AC4 — counts Actors as satisfied when the use is to be determined, with no actor added', () => {
      build();
      component.body = { innov_use_to_be_determined: true };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...ACTORS, filled: true });
    });

    it('AC3 — Actors stays unsatisfied when the use is NOT to be determined and no actor was added', () => {
      build();
      component.body = { innov_use_to_be_determined: false, actors: [] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...ACTORS, filled: false });
    });

    it('counts Actors once at least one active actor exists', () => {
      build();
      component.body = { innov_use_to_be_determined: false, actors: [{ actor_type_id: 1, is_active: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...ACTORS, filled: true });
    });

    it('ignores soft-deleted actors when counting Actors', () => {
      build();
      component.body = { innov_use_to_be_determined: false, actors: [{ actor_type_id: 1, is_active: false }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...ACTORS, filled: false });
    });

    it('leaves Actors unsatisfied while the to-be-determined question is unanswered', () => {
      build();
      component.body = { actors: [{ actor_type_id: 1, is_active: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...ACTORS, filled: false });
    });

    it('AC6 — counts Other quantitative measures only when a row carries BOTH unit and quantity', () => {
      build();
      component.body = { measures: [{ unit_of_measure: 'ha', is_active: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...MEASURES, filled: false });

      component.body = { measures: [{ quantity: 12, is_active: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...MEASURES, filled: false });

      component.body = { measures: [{ unit_of_measure: 'ha', quantity: 12, is_active: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...MEASURES, filled: true });
    });

    it('ignores soft-deleted measures', () => {
      build();
      component.body = { measures: [{ unit_of_measure: 'ha', quantity: 12, is_active: false }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...MEASURES, filled: false });
    });

    /**
     * P2-3785 AC1 — the use level is no longer a standard (Nicoleta Trifa, #INC-163204 point 4a),
     * reversing P2-3428's AC7. Asserted with the level ANSWERED, not blank: publishing it would be
     * invisible on a blank section (everything is unfilled there) and would only show up as a
     * section that refuses to reach 100% once the reporter fills the three real items.
     */
    it('P2-3785 AC1 — never publishes the use level, even once the reporter picks one', () => {
      build();
      component.body = { innovation_use_level_id: '6' };
      component.updateMds();
      expect(lastFields().map((f: any) => f.key)).not.toContain('use-level');
    });

    /**
     * P2-3785 AC1 reverses this: the ladder used to carry its pending marker BECAUSE it was an MDS
     * item the footer counted. It is not one any more, so a marker would name a field that can never
     * hold Submit back — the very "count that names a finished-looking field" this assertion was
     * written to prevent, only inverted. The ladder stays on screen; only the demand is gone.
     * Asserted as text because this spec `overrideTemplate`s, same approach as the tests above.
     */
    it('P2-3785 AC1 — the use ladder no longer asks for its pending marker', () => {
      const html = readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');

      // Asserted on the two attributes, not on their indentation: P2-3428 wrapped the fields in a
      // `contents` div for the read-only gate and every line below shifted by two spaces.
      const ladder = /\[options\]="innovationControlListSE\.useLevelsList"\s*\n\s*\[required\]="false"/;
      expect(html).toMatch(ladder);
      // And it is still rendered — "not required" must not become "not shown".
      expect(html).toContain('innovationControlListSE.useLevelsList');
    });

    /**
     * P2-3785 AC3 (Nicoleta Trifa, #INC-163204 point 4c): the three destinations of the USD estimation
     * — Program, bilateral project, external partners — are rendered TOGETHER, above the full-metadata
     * toggle. They used to be split, with Programs and Partners behind the toggle, so a reporter who
     * never opened it saw one of the three amounts they were asked for and reported the other two as
     * missing from the form.
     *
     * The two assertions that matter are the pair: all three tables render, and only the bilateral one
     * is REQUIRED. Dropping the second would quietly turn optional investment into a submit blocker —
     * investment is deliberately outside the green check (PO decision, 9-Sep-2026).
     */
    it('P2-3785 AC3 — renders the three investment tables together, with only the bilateral one required', () => {
      const html = readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');

      expect(html).toContain("[sections]=\"['programs', 'bilateral', 'partners']\"");
      expect(html).toContain('[requiredSections]="[\'bilateral\']"');
      // Exactly one investment block: the Programs/Partners copy under the toggle is gone, and two
      // `app-estimates-cgiar` bound to the same `body` would render every row twice.
      expect(html.match(/<app-estimates-cgiar/g)?.length).toBe(1);
      expect(html).not.toContain("[sections]=\"['programs', 'partners']\"");
      // Above the toggle, where the MDS note sits — not inside the full-metadata block.
      expect(html.indexOf("[sections]=\"['programs', 'bilateral', 'partners']\"")).toBeLessThan(html.indexOf('mdsInfoNote'));
      // The old placeholder and its tag are gone for good.
      expect(html).not.toContain('body.investment_bilateral_usd');
      expect(html).not.toContain('use-investment-coming-soon');
      expect(html).not.toContain('Not available yet');
    });

    it('P2-3390 — sends the three investment arrays in the payload', () => {
      build();
      component.body = {
        investment_programs: [{ id: 90, kind_cash: 100, is_determined: null }],
        investment_bilateral: [{ id: 4321, project_id: 4321, kind_cash: null, is_determined: true }],
        investment_partners: [{ id: 77, kind_cash: 250, is_determined: null }]
      };
      component.onSave();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.investment_programs).toEqual([{ id: 90, kind_cash: 100, is_determined: null }]);
      expect(payload.investment_bilateral).toEqual([{ id: 4321, project_id: 4321, kind_cash: null, is_determined: true }]);
      expect(payload.investment_partners).toEqual([{ id: 77, kind_cash: 250, is_determined: null }]);
      // 🛑 The legacy nested keys must never be sent from here: their writer resolves the
      // `non_pooled_project` catalogue and drops every bilateral row in silence.
      expect(payload).not.toHaveProperty('bilateral_expected_investment');
      expect(payload).not.toHaveProperty('initiative_expected_investment');
      expect(payload).not.toHaveProperty('institutions_expected_investment');
    });

    it('P2-3390 — sends empty arrays when the tables hold nothing, which the server treats as a no-op', () => {
      build();
      component.body = {};
      component.onSave();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.investment_programs).toEqual([]);
      expect(payload.investment_bilateral).toEqual([]);
      expect(payload.investment_partners).toEqual([]);
    });

    it('never sends investment_bilateral_usd in the payload — the server has no column for it', () => {
      build();
      component.body = { investment_bilateral_usd: 15000 };
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).not.toHaveProperty('investment_bilateral_usd');
    });

    it('P2-3428 — publishes bilateral investment to the MDS tracker', () => {
      build();
      component.body = { investment_bilateral: [{ kind_cash: 15000, is_determined: null }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...INVESTMENT, filled: true });
    });

    it('accepts an explicit yet-to-be-determined answer and rejects zero or blank investment', () => {
      build();
      component.body = { investment_bilateral: [{ kind_cash: null, is_determined: true }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...INVESTMENT, filled: true });

      component.body = { investment_bilateral: [{ kind_cash: 0, is_determined: null }] };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...INVESTMENT, filled: false });
    });

    it('P2-3428 — all four MDS fields are needed to complete the section', () => {
      build();
      component.body = {
        innov_use_to_be_determined: false,
        actors: [{ actor_type_id: 1, is_active: true }],
        measures: [{ unit_of_measure: 'ha', quantity: 3, is_active: true }],
        innovation_use_level_id: '6',
        investment_bilateral: [{ kind_cash: 500, is_determined: null }]
      };
      component.updateMds();
      expect(lastFields().every((f: any) => f.filled)).toBe(true);
    });

    it('AC16 — nothing revealed by the toggle moves the MDS tracker', () => {
      build();
      component.body = {};
      component.updateMds();
      const before = lastFields();

      component.body = {
        organization: [{ institution_types_id: 10, is_active: true }],
        has_scaling_studies: true,
        scaling_studies_urls: ['https://example.org/study'],
        readiness_level_explanation: 'Because the evidence says so.',
        innov_use_2030_to_be_determined: true,
        has_innovation_link: true,
        linked_result_id: 42
      };
      component.updateMds();
      expect(lastFields()).toEqual(before);
    });
  });

  /**
   * Night sweep 2026-09-23, BIL-1 — measured on prtest (result 9519): an actor row with Women 5 /
   * Men 6 and no actor type went out in the PATCH, the server skipped it as blank (146d26112's
   * `isDiscardable`, which judges a new actor row by `actor_type_id` only) and answered 201; the row
   * was gone on reload while the section read complete. Control negative: with
   * `patchUnlessActorMissingType` sending unconditionally and `actorWithoutType` dropped from
   * `updateMds`, the "refuses" and "incomplete" tests below fail.
   */
  describe('BIL-1 — an actor row with figures but no actor type', () => {
    const executorOf = () => {
      const [, , options] = autoSave.schedulePayload.mock.calls.at(-1);
      return options.executor as (resultId: number, body: Record<string, unknown>) => any;
    };
    const lastActorsField = () => {
      const [, fields] = mdsTracker.setSectionFields.mock.calls.at(-1);
      return fields.find((f: any) => f.key === 'use-actors');
    };

    it('refuses to send the staged payload and says why, even when it was staged while the row was still blank', () => {
      build();
      component.body = { ...component.body, innov_use_to_be_determined: false, actors: [] };
      component.addActor(); // staged with a blank row — discardable, fine to stage
      const executor = executorOf();
      component.body.actors[0].women = 5; // typed afterwards, into the SAME row object the payload holds
      component.body.actors[0].men = 6;

      let error: any;
      executor(123, {}).subscribe({ error: (e: any) => (error = e) });

      expect(bilateralApi.PATCH_innovationUse).not.toHaveBeenCalled();
      expect(error?.error?.message).toBe(component.copy.actorTypeMissing);
    });

    it('keeps "Actors" incomplete while such a row is on screen', () => {
      build();
      component.body = {
        innov_use_to_be_determined: false,
        actors: [
          { actor_type_id: 1, women: 2, is_active: true },
          { actor_type_id: null, women: 5, men: 6, is_active: true }
        ]
      };
      component.onFieldChange();

      expect(component.actorMissingType(component.body.actors[1])).toBe(true);
      expect(lastActorsField().filled).toBe(false);
    });

    it('still sends a truly blank staged row (146d26112 keeps discarding it server-side)', () => {
      build();
      component.body = { ...component.body, innov_use_to_be_determined: false, actors: [{ actor_type_id: 1, women: 2, is_active: true }] };
      component.addActor();

      executorOf()(123, { any: 1 }).subscribe();

      expect(component.actorMissingType(component.body.actors[1])).toBe(false);
      expect(bilateralApi.PATCH_innovationUse).toHaveBeenCalledWith(123, { any: 1 });
    });

    it('sends normally once the row gets its actor type', () => {
      build();
      component.body = { ...component.body, innov_use_to_be_determined: false, actors: [{ actor_type_id: null, women: 5, is_active: true }] };
      component.body.actors[0].actor_type_id = 1;
      component.onFieldChange();

      executorOf()(123, {}).subscribe();

      expect(bilateralApi.PATCH_innovationUse).toHaveBeenCalledTimes(1);
      expect(lastActorsField().filled).toBe(true);
    });

    it('ignores a deleted row and rows hidden behind "yet to be determined"', () => {
      build();
      component.body = {
        innov_use_to_be_determined: true,
        actors: [{ actor_type_id: null, women: 5, is_active: true }],
        innovation_use_2030: { actors: [{ actor_type_id: null, men: 3, is_active: false }], organization: [], measures: [] }
      };

      expect(component.hasActorMissingType).toBe(false);
    });

    it('also catches the 2030 projection actors while that list is shown (same server writer)', () => {
      build();
      component.body = {
        innov_use_to_be_determined: true,
        innov_use_2030_to_be_determined: false,
        innovation_use_2030: { actors: [{ actor_type_id: null, how_many: 7, is_active: true }], organization: [], measures: [] }
      };

      expect(component.hasActorMissingType).toBe(true);
    });

    it('the row carries the message in the template', () => {
      const html = readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');
      expect(html).toContain('@if (actorMissingType(actor)) {');
      expect(html).toContain('{{ copy.actorTypeMissing }}');
    });
  });

  describe('save flow', () => {
    it('onFieldChange sends the top-level fields and the nested innovatonUse payload', () => {
      build();
      component.body = {
        innov_use_to_be_determined: false,
        innovation_use_level_id: 5,
        actors: [{ actor_type_id: 1 }],
        organization: [{ institution_types_id: 2 }],
        measures: [{ unit_of_measure: 'ha' }]
      };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        expect.objectContaining({
          innov_use_to_be_determined: false,
          innovation_use_level_id: 5,
          innovatonUse: {
            actors: [{ actor_type_id: 1 }],
            organization: [{ institution_types_id: 2 }],
            measures: [{ unit_of_measure: 'ha' }]
          }
        }),
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' })
      );
    });

    it('flattens a chosen sub-type into institution_types_id for the outgoing payload, without mutating body', () => {
      build();
      const organization = { institution_types_id: 10, institution_sub_type_id: 11, how_many: 4 };
      component.body = { organization: [organization] };
      component.onFieldChange();
      const [, payload] = autoSave.schedulePayload.mock.calls[0];
      expect((payload as any).innovatonUse.organization).toEqual([{ institution_types_id: 11, how_many: 4 }]);
      // The UI-bound object must still carry the sub-type so the cascade keeps rendering correctly.
      expect(organization).toEqual({ institution_types_id: 10, institution_sub_type_id: 11, how_many: 4 });
    });

    it('leaves a top-level-only organization unchanged in the outgoing payload', () => {
      build();
      component.body = { organization: [{ institution_types_id: 20, how_many: 2 }] };
      component.onFieldChange();
      const [, payload] = autoSave.schedulePayload.mock.calls[0];
      expect((payload as any).innovatonUse.organization).toEqual([{ institution_types_id: 20, how_many: 2 }]);
    });

    it('omits the PK when creating, includes it when editing', () => {
      build();
      component.body = {};
      component.onSave();
      let [, payload] = autoSave.schedulePayload.mock.calls[0];
      expect((payload as any).result_innovation_use_id).toBeUndefined();

      component.body = { result_innovation_use_id: 7 };
      component.onSave();
      [, payload] = autoSave.schedulePayload.mock.calls[1];
      expect((payload as any).result_innovation_use_id).toBe(7);
    });

    // P2-3556 regression guards: the load gate must not touch the two things that legitimately save.
    it('saves normally once the body has loaded', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { innovation_use_level_id: 4, readiness_level_explanation: 'stored' } }));
      build();
      autoSave.schedulePayload.mockClear();

      component.body.readiness_level_explanation = 'edited';
      component.onFieldChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect((payload as any).readiness_level_explanation).toBe('edited');
      expect((payload as any).innovation_use_level_id).toBe(4);
    });

    it('still persists the removal of the last row of every list', () => {
      const actor = { result_actors_id: 9, actor_type_id: 1, is_active: true };
      const organization = { result_by_institution_type_id: 4, institution_types_id: 10, is_active: true };
      const measure = { result_ip_measure_id: 6, unit_of_measure: 'ha', quantity: 3, is_active: true };
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { actors: [actor], organization: [organization], measures: [measure], scaling_studies_urls: ['https://a'] } })
      );
      build();

      component.deleteActor(component.body.actors[0]);
      component.deleteOrganization(component.body.organization[0]);
      component.deleteMeasure(component.body.measures[0]);
      component.deleteStudyLink(0);

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      // The rows stay in the payload flagged inactive — that is HOW the server deletes them; dropping
      // them would silently keep them alive (`innovation_dev.service.ts:158`, `:259`, `:323` only ever
      // look at the rows they are given).
      expect((payload as any).innovatonUse.actors).toEqual([expect.objectContaining({ is_active: false })]);
      expect((payload as any).innovatonUse.organization).toEqual([expect.objectContaining({ is_active: false })]);
      expect((payload as any).innovatonUse.measures).toEqual([expect.objectContaining({ is_active: false })]);
      // The empty array IS the deletion for the study links: `shouldSync` is true because the key is
      // present, and the sync de-activates every stored row (`summary.service.ts:228-245`).
      expect((payload as any).scaling_studies_urls).toEqual([]);
    });

    it('onSave queues an immediate save', () => {
      build();
      component.body = {};
      component.onSave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith('typeSpecific', expect.anything(), expect.objectContaining({ debounceMs: 0 }));
    });

    it('tracks the saving state from fieldStatus', () => {
      build();
      expect(component.saving()).toBe(false);
      autoSave.fieldStatus.set({ 'type-specific': 'saving' });
      expect(component.saving()).toBe(true);
    });
  });

  describe('MDS info note — P2-3428 AC1 / P2-3331 AC2', () => {
    it('exposes the note verbatim, as the story and QA quote it', () => {
      build();
      expect(component.mdsInfoNote).toBe(
        'The fields displayed on this screen correspond to the minimum data standard (MDS) required for bilateral result reporting. ' +
          'If you need to complete the full metadata for this section, click the button on the right.'
      );
    });
  });

  describe('toggleShowAll — P2-3428 AC9 / AC10', () => {
    it('flips the signal and persists it under the current result id', () => {
      build();
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(true);
      expect(expandableState.setShowAllFields).toHaveBeenCalledWith(123, 'type-specific', true);
      component.toggleShowAll();
      expect(expandableState.setShowAllFields).toHaveBeenLastCalledWith(123, 'type-specific', false);
    });

    it('AC10 — collapsing keeps the full-metadata values and still sends them on the next save', () => {
      build();
      component.body = { readiness_level_explanation: 'kept', has_scaling_studies: true, scaling_studies_urls: ['https://a.b'] };
      component.toggleShowAll();
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(false);
      expect(component.body.readiness_level_explanation).toBe('kept');

      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).toMatchObject({
        readiness_level_explanation: 'kept',
        has_scaling_studies: true,
        scaling_studies_urls: ['https://a.b']
      });
    });

    it('the toggle never touches the MDS tracker — the section can be complete while collapsed', () => {
      build();
      mdsTracker.setSectionFields.mockClear();
      component.toggleShowAll();
      expect(mdsTracker.setSectionFields).not.toHaveBeenCalled();
    });
  });

  describe('use level gates — P2-3428 AC13 / P2-3294', () => {
    it('resolves the numeric use level behind the stored id', () => {
      build();
      fixture.detectChanges();
      component.body = { innovation_use_level_id: '6' };
      expect(component.useLevelNumber).toBe(5);
      component.body = {};
      expect(component.useLevelNumber).toBe(-1);
    });

    it('shows the scaling studies question below use level 6 and hides it from 6 upwards', () => {
      build();
      fixture.detectChanges();
      component.body = { innovation_use_level_id: '4' };
      expect(component.showScalingStudies).toBe(true);
      component.body = { innovation_use_level_id: '6' };
      expect(component.showScalingStudies).toBe(true);
      component.body = { innovation_use_level_id: '7' };
      expect(component.showScalingStudies).toBe(false);
    });

    // Confirmed by the PO (Ángel Jarrín, 26-ago-2026): the question hides only once the level reaches 6 —
    // an unanswered level is not "6 or higher", so it must stay visible, exactly like levels 0-5.
    it('shows the scaling studies question while no use level is picked yet', () => {
      build();
      fixture.detectChanges();
      component.body = {};
      expect(component.showScalingStudies).toBe(true);
    });

    it('shows the scaling studies question at level 5 and hides it at level 6 and level 9', () => {
      build();
      fixture.detectChanges();
      // id '6' -> level 5 per the mock catalog above.
      component.body = { innovation_use_level_id: '6' };
      expect(component.showScalingStudies).toBe(true);
      // id '7' -> level 6 per the mock catalog above.
      component.body = { innovation_use_level_id: '7' };
      expect(component.showScalingStudies).toBe(false);
      innovationControlListSE.useLevelsList = [...innovationControlListSE.useLevelsList, { id: '10', level: 9, name: 'Level 9' }];
      component.body = { innovation_use_level_id: '10' };
      expect(component.showScalingStudies).toBe(false);
    });

    // A hidden control must not keep persisting the answer it held: the user can no longer see it or
    // correct it. Same rule `onInnovationLinkChange` applies to the linked result.
    describe('onUseLevelChange — clears the scaling-studies answer once the question disappears', () => {
      it('drops the answer and its URLs when the level reaches 6', () => {
        build();
        fixture.detectChanges();
        component.body = {
          innovation_use_level_id: '7',
          has_scaling_studies: true,
          scaling_studies_urls: ['https://example.org/a', 'https://example.org/b']
        };
        component.onUseLevelChange();
        expect(component.body.has_scaling_studies).toBeNull();
        expect(component.body.scaling_studies_urls).toEqual([]);
      });

      it('keeps the answer while the level stays below 6', () => {
        build();
        fixture.detectChanges();
        component.body = {
          innovation_use_level_id: '6',
          has_scaling_studies: true,
          scaling_studies_urls: ['https://example.org/a']
        };
        component.onUseLevelChange();
        expect(component.body.has_scaling_studies).toBe(true);
        expect(component.body.scaling_studies_urls).toEqual(['https://example.org/a']);
      });

      it('leaves the answer untouched while no level is picked — nothing was hidden yet', () => {
        build();
        fixture.detectChanges();
        component.body = { has_scaling_studies: false, scaling_studies_urls: [] };
        component.onUseLevelChange();
        expect(component.body.has_scaling_studies).toBe(false);
      });

      it('the cleared values are what the next save carries', () => {
        build();
        fixture.detectChanges();
        component.body = {
          innovation_use_level_id: '7',
          has_scaling_studies: true,
          scaling_studies_urls: ['https://example.org/a']
        };
        component.onUseLevelChange();
        const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
        expect(payload).toMatchObject({ has_scaling_studies: null, scaling_studies_urls: [] });
      });
    });

    it('shows the use-level explanation only for levels 5 to 9, as W1/W2 does', () => {
      build();
      fixture.detectChanges();
      component.body = { innovation_use_level_id: '4' };
      expect(component.showUseLevelExplanation).toBe(false);
      component.body = { innovation_use_level_id: '6' };
      expect(component.showUseLevelExplanation).toBe(true);
    });
  });

  describe('study links', () => {
    it('adds and removes plain-string links and autosaves each time', () => {
      build();
      component.body = {};
      component.addStudyLink();
      expect(component.body.scaling_studies_urls).toEqual(['']);
      component.body.scaling_studies_urls[0] = 'https://example.org/study';
      component.addStudyLink();
      expect(component.body.scaling_studies_urls).toEqual(['https://example.org/study', '']);
      component.deleteStudyLink(0);
      expect(component.body.scaling_studies_urls).toEqual(['']);
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('link to a QA-ed Innovation Development result — P2-3424', () => {
    /**
     * AC4 — the dropdown must offer the QA'd Innovation Development results of the previous phase,
     * across every portfolio. That catalogue is owned by `QaInnovationDevelopmentResultsService`
     * (P2-3422) and is exactly what W1/W2 already reads, which is why the filtering below is the
     * SERVICE's job and not this component's.
     *
     * 🛑 The previous implementation read the wide Contributors & Partners list and narrowed it here
     * with `status_id === 2`. That comment claimed the endpoint carried no status; it does —
     * `getResultsForInnovUse` (result.repository.ts:3079) selects `r.status_id` and filters
     * `IN (2, 6)` — so the client filter silently dropped every Approved (6) result. A bilateral
     * Innovation Development is Approved, so the dropdown was missing precisely what AC4 asks for.
     */
    const options = [
      { id: 1, result_code: 1001, title: 'QA-ed innovation', status_id: 2, phase_year: 2025, acronym: 'SP01', display: '1001 - QA-ed innovation' },
      {
        id: 2,
        result_code: 1002,
        title: 'Approved bilateral innovation',
        status_id: 6,
        phase_year: 2025,
        acronym: null,
        display: '1002 - Approved bilateral innovation'
      }
    ];

    it('offers the shared QA catalogue verbatim, Approved results included', () => {
      // The Approved (6) row is the regression guard: the old client filter threw it away.
      qaInnovationsSE.options.set(options);
      build();
      expect(component.qaInnovationDevelopmentResults.map((r: any) => r.id)).toEqual([1, 2]);
    });

    it('asks the shared catalogue to load, so bilateral and W1/W2 can never diverge', () => {
      build();
      expect(qaInnovationsSE.load).toHaveBeenCalled();
    });

    it('keeps a previously linked result that is no longer in the catalogue', () => {
      // Otherwise the select paints empty and the next save wipes a link the user never touched.
      qaInnovationsSE.options.set(options);
      build();
      component.body = { has_innovation_link: true, linked_result_id: 777 };

      const shown = component.qaInnovationDevelopmentResults;

      expect(shown.map((r: any) => r.id)).toEqual([777, 1, 2]);
      expect(shown[0].display).toContain('777');
    });

    it('does not duplicate the linked result when it IS in the catalogue', () => {
      qaInnovationsSE.options.set(options);
      build();
      component.body = { has_innovation_link: true, linked_result_id: 1 };

      expect(component.qaInnovationDevelopmentResults.map((r: any) => r.id)).toEqual([1, 2]);
    });

    it('tolerates an empty catalog', () => {
      qaInnovationsSE.options.set([]);
      build();
      expect(component.qaInnovationDevelopmentResults).toEqual([]);
    });

    it('is shown from the 2026 phase onwards and hidden for earlier phases', () => {
      creation.reportingYear.set(2026);
      build();
      expect(component.showInnovationLinkQuestion).toBe(true);

      creation.reportingYear.set(2025);
      build();
      expect(component.showInnovationLinkQuestion).toBe(false);

      creation.reportingYear.set(null);
      build();
      expect(component.showInnovationLinkQuestion).toBe(true);
    });

    it('answering No clears the previously linked result', () => {
      build();
      component.body = { has_innovation_link: false, linked_result_id: 42 };
      component.onInnovationLinkChange();
      expect(component.body.linked_result_id).toBeNull();
    });

    it('answering Yes keeps the chosen result', () => {
      build();
      component.body = { has_innovation_link: true, linked_result_id: 42 };
      component.onInnovationLinkChange();
      expect(component.body.linked_result_id).toBe(42);
    });

    it('never counts toward the MDS tracker', () => {
      build();
      component.body = { has_innovation_link: true, linked_result_id: 42 };
      component.updateMds();
      const keys = mdsTracker.setSectionFields.mock.calls.at(-1)[1].map((f: any) => f.key);
      expect(keys).not.toContain('innovation-link');
      // Three since P2-3785 AC1 dropped the use level. Named rather than counted: a bare length passes
      // just as happily when the wrong item is the one missing.
      expect(keys).toEqual(['use-actors', 'use-measures', 'use-investment']);
    });

    it('hydrates the single selection out of the stored linked_results list', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { has_innovation_link: 1, linked_results: [{ id: 77 }] } }));
      build();
      fixture.detectChanges();
      expect(component.body.linked_result_id).toBe(77);
      expect(component.body.has_innovation_link).toBe(true);
    });

    it('sends the selection back as a one-item list', () => {
      build();
      component.body = { has_innovation_link: true, linked_result_id: 77 };
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).toMatchObject({ has_innovation_link: true, linked_results: [77] });
    });

    it('sends an empty list when nothing is linked', () => {
      build();
      component.body = {};
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).toMatchObject({ linked_results: [] });
    });
  });

  /**
   * P2-3533 — `innov_use_to_be_determined` was the one answer missing from `hydrateStoredAnswers()`,
   * and it is the field that gates the whole Actors block (`.component.html:17`, `=== false`).
   * On reload it came back as `0`, `0 === false` is false, so the block never rendered and the radio
   * matched neither option: the actors looked lost and the obvious reaction is to add them again.
   */
  describe('P2-3533 — reload of the answer that gates the Actors block', () => {
    it('normalizes the stored 0 into the false the radio binds, keeping the actors reachable', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({
          response: {
            innov_use_to_be_determined: 0,
            actors: [{ actor_type_id: 1, women: 2, men: 3 }]
          }
        })
      );
      build();
      fixture.detectChanges();

      // The strict `=== false` in the template is what renders the block; a `0` here fails it.
      expect(component.body.innov_use_to_be_determined).toBe(false);
      expect(component.body.actors).toHaveLength(1);
    });

    it('normalizes a stored 1 into true', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { innov_use_to_be_determined: 1 } }));
      build();
      fixture.detectChanges();

      expect(component.body.innov_use_to_be_determined).toBe(true);
    });

    it('leaves the question unanswered instead of turning it into a No', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { innov_use_to_be_determined: null } }));
      build();
      fixture.detectChanges();

      expect(component.body.innov_use_to_be_determined).toBeNull();
    });
  });

  // P2-3424 — the endpoint now stores and returns these fields, so what the user typed has to come back
  // usable. MySQL hands `tinyint` columns over as 1/0 and the radios bind true/false.
  describe('P2-3424 — reload of the fields the endpoint now persists', () => {
    it('normalizes the stored tinyint answers into the booleans the radios bind', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { has_scaling_studies: 1, innov_use_2030_to_be_determined: 0, has_innovation_link: 0 } })
      );
      build();
      fixture.detectChanges();
      expect(component.body.has_scaling_studies).toBe(true);
      expect(component.body.innov_use_2030_to_be_determined).toBe(false);
      expect(component.body.has_innovation_link).toBe(false);
    });

    it('leaves an unanswered question unanswered instead of turning it into a No', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { has_scaling_studies: null, innov_use_2030_to_be_determined: null } }));
      build();
      fixture.detectChanges();
      expect(component.body.has_scaling_studies).toBeNull();
      expect(component.body.innov_use_2030_to_be_determined).toBeNull();
    });

    it('reloads the study links and the use-level explanation ready to be edited', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({
          response: {
            has_scaling_studies: 1,
            scaling_studies_urls: ['https://example.org/study'],
            readiness_level_explanation: 'Because the evidence says so.'
          }
        })
      );
      build();
      fixture.detectChanges();
      expect(component.body.scaling_studies_urls).toEqual(['https://example.org/study']);

      component.addStudyLink();
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).toMatchObject({
        has_scaling_studies: true,
        scaling_studies_urls: ['https://example.org/study', ''],
        readiness_level_explanation: 'Because the evidence says so.'
      });
    });

    it('hydrates a plain numeric linked_results list, which is what the endpoint returns', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { has_innovation_link: 1, linked_results: [77] } }));
      build();
      fixture.detectChanges();
      expect(component.body.linked_result_id).toBe(77);
      expect(component.body.has_innovation_link).toBe(true);
    });
  });
});
