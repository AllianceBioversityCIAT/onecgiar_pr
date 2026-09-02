import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { TypeCapacitySharingComponent } from './type-capacity-sharing.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';

describe('TypeCapacitySharingComponent', () => {
  let fixture: ComponentFixture<TypeCapacitySharingComponent>;
  let component: TypeCapacitySharingComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let institutionsSE: any;

  const TERMS_CATALOG = [
    { capdev_term_id: 1, name: 'Long-term (sub A)' },
    { capdev_term_id: 2, name: 'Long-term (sub B)' },
    { capdev_term_id: 3, name: 'Short-term' },
    { capdev_term_id: 4, name: 'Long-term' },
  ];

  /**
   * P2-3556 — `build()` now RUNS the first change detection, so `ngOnInit` fires and the default
   * `GET_capacityDevelopment` mock (which resolves synchronously) leaves the component `loaded`.
   * Every save is now gated on that flag, so a component that was never initialized can no longer
   * save anything — which is the point of the fix, and would otherwise silently neuter every save
   * assertion in this file (they would pass because nothing ever loaded, not because saving works).
   */
  const build = () => {
    fixture = TestBed.createComponent(TypeCapacitySharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  const makeMocks = () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = {
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn(),
    };
    creation = { currentResultId: signal<number | null>(123) };
    expandableState = {
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn(),
    };
    institutionsSE = { institutionsList: [{ institutions_id: 1, institutions_name: 'Org A' }] };
    bilateralApi = {
      GET_capacityDevelopment: jest.fn().mockReturnValue(of({ response: {} })),
      GET_capdevsDeliveryMethod: jest.fn().mockReturnValue(of({ response: [{ capdev_delivery_method_id: 1, name: 'In person' }] })),
      GET_capdevsTerms: jest.fn().mockReturnValue(of({ response: [...TERMS_CATALOG] })),
      PATCH_capacityDevelopment: jest.fn().mockReturnValue(of({})),
    };
  };

  const configure = () =>
    TestBed.configureTestingModule({
      imports: [TypeCapacitySharingComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: InstitutionsService, useValue: institutionsSE },
      ],
    });

  beforeEach(async () => {
    makeMocks();
    await configure().overrideTemplate(TypeCapacitySharingComponent, '<div></div>').compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body, delivery methods and splits the terms catalog into sub-terms/terms', () => {
      build();
      fixture.detectChanges();
      expect(component.deliveryMethods).toEqual([{ capdev_delivery_method_id: 1, name: 'In person' }]);
      expect(component.capdevsSubTerms).toEqual([TERMS_CATALOG[0], TERMS_CATALOG[1]]);
      expect(component.capdevsTerms).toEqual([TERMS_CATALOG[2], TERMS_CATALOG[3]]);
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

    it('does nothing when there is no current result id', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_capacityDevelopment).not.toHaveBeenCalled();
    });

    it('falls back to empty defaults when the responses are empty', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(of({ response: null }));
      bilateralApi.GET_capdevsDeliveryMethod.mockReturnValue(of({ response: null }));
      bilateralApi.GET_capdevsTerms.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.body).toEqual({});
      expect(component.deliveryMethods).toEqual([]);
      expect(component.capdevsSubTerms).toEqual([]);
      expect(component.capdevsTerms).toEqual([]);
    });

    it.each([
      [1, true],
      ['1', true],
      [0, false],
      ['0', false],
      [null, null],
    ])('normalizes the legacy attendance value %p to %p for the radio control', (storedValue, expectedValue) => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(of({ response: { is_attending_for_organization: storedValue } }));
      build();
      fixture.detectChanges();
      expect(component.body.is_attending_for_organization).toBe(expectedValue);
    });
  });

  describe('term cascade hydration on load', () => {
    it.each([
      [4, 4, null],
      [3, 3, null],
      [1, 4, 1],
      [2, 4, 2],
    ])('capdev_term_id=%i -> capdevTermId1=%i, capdevTermId2=%p', (stored, expected1, expected2) => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(of({ response: { capdev_term_id: stored } }));
      build();
      fixture.detectChanges();
      expect(component.capdevTermId1).toBe(expected1);
      expect(component.capdevTermId2).toBe(expected2);
    });

    it('leaves both null when there is no stored term id', () => {
      build();
      fixture.detectChanges();
      expect(component.capdevTermId1).toBeNull();
      expect(component.capdevTermId2).toBeNull();
    });
  });

  // P2-3382: the checklist is exactly the three fields the story names — people trained, length of
  // training, delivery method. "Attending on behalf of an organization" used to be a fourth item
  // while the story places it in full metadata, so the section could not go green until the user
  // answered a question the spec calls optional. It is deliberately absent from these expectations.
  //
  // P2-3346/P2-3348: the four participant counts render as OPTIONAL, so tracking three of them
  // individually (and ignoring "Unknown" entirely) both contradicted the labels and could hold the
  // Submit button disabled — it is gated on overallStatus() === 'complete'. AC1 lists "Number of
  // people trained" as one mandatory field, and the on-screen hint sends users to "Unknown" when the
  // gender split is unavailable, so the group is what has to be satisfied.
  // P2-3355 pattern, applied here: registering the checklist only on success left the section with an
  // empty field list, which renders as "0/0 fields" — read as "nothing required here" rather than as
  // incomplete. A successful load can only ever read 0/3 .. 3/3, never 0/0, so 0/0 was the tell.
  describe('when the fetch fails', () => {
    const failLoad = () => bilateralApi.GET_capacityDevelopment.mockReturnValue(throwError(() => new Error('500')));

    it('still publishes the three unfilled MDS items, so the section stays incomplete', () => {
      failLoad();
      build();
      fixture.detectChanges();   // build() only creates the component; ngOnInit runs here
      const items = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(items).toHaveLength(3);
      expect(items.every((i: any) => i.filled === false)).toBe(true);
    });

    it('leaves the body empty rather than half-hydrated', () => {
      failLoad();
      build();
      fixture.detectChanges();
      expect(component.body).toEqual({});
    });

    /**
     * P2-3556 — the data-loss chain, cut at its root.
     *
     * The error handler above already emptied `body` and published the checklist (P2-3355), but it
     * did not stop the form from SAVING that empty body. The interceptor rethrows every failed
     * response (`shared/interceptors/general-interceptor.service.ts:81-83`), so `next` never ran,
     * the form painted blank with no warning, and the first keystroke autosaved `{ ...this.body }`
     * — which the server reads as a deletion, not as "nothing to say":
     *
     * - the four participant counts are written as `female_using || 0` and friends
     *   (`api/results/summary/summary.service.ts:405-408` on the update branch, `:420-424` on the
     *   insert branch), so a key that is simply absent is stored as **0**;
     * - `institutions` absent (or `[]`) falls into the `else` branch of `saveCapacityDevelopents`
     *   (`summary.service.ts:433`, `:460-467`), which calls
     *   `updateGenericIstitutions(resultId, [], 3, …)`; that runs `upDateAllInactiveRBI` —
     *   `set is_active = 0 … where result_id = ? and institution_roles_id = ?`
     *   (`results_by_institutions/result_by_intitutions.repository.ts:606-650`) — de-activating
     *   EVERY stored organization.
     *
     * Unlike Policy Change, this GET never answers 404: `getCapacityDevelopents` returns 200 with a
     * null skeleton when there is no row (`summary.service.ts:495-521`; measured on prtest
     * 2-Sep-2026, `…/capacity-developent/get/result/999999` → `200 {"result_capacity_development_id":
     * null,…}`). So every error here really is one — 401 on an expired token, a 5xx, an Apache 403 or
     * a dropped connection — and none of them may be allowed to write.
     *
     * These assert on the ABSENCE of a request, which is the only thing that separates the fix from
     * the defect: the old code reached `schedulePayload` on every one of these paths.
     */
    describe('refuses to autosave over what it could not read (P2-3556)', () => {
      it('leaves the section not loaded', () => {
        failLoad();
        build();
        expect(component.loaded()).toBe(false);
      });

      it('sends NOTHING when the person types on a form that never loaded', () => {
        failLoad();
        build();
        autoSave.schedulePayload.mockClear();

        component.body.female_using = 5;
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

      it.each([['onCapdevTermId1Change'], ['onCapdevTermId2Change'], ['onAttendanceChange']])(
        'sends nothing from %s, the other write paths',
        method => {
          failLoad();
          build();
          component.capdevTermId1 = 4;
          autoSave.schedulePayload.mockClear();

          (component as any)[method]();

          expect(autoSave.schedulePayload).not.toHaveBeenCalled();
        }
      );
    });

    /**
     * P2-3556, the secondary window: the GET takes 240-620 ms on prtest against an 800 ms autosave
     * debounce, so an edit could reach the PATCH before the body ever arrived — and a payload built
     * from `{}` zeroes the counts and deletes the organizations exactly as a failed load does.
     * `null` therefore blocks too.
     */
    describe('while the GET is still in flight (P2-3556)', () => {
      it('sends nothing before the body arrives, and saves normally afterwards', () => {
        const inFlight = new Subject<any>();
        bilateralApi.GET_capacityDevelopment.mockReturnValue(inFlight.asObservable());
        build();

        expect(component.loaded()).toBeNull();
        component.body.female_using = 5;
        component.onFieldChange();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();

        inFlight.next({ response: { female_using: 9, institutions: [{ institutions_id: 7 }] } });
        expect(component.loaded()).toBe(true);

        component.onFieldChange();
        expect(autoSave.schedulePayload).toHaveBeenCalledTimes(1);
      });
    });

    it('marks the section as loaded once the body is in hand', () => {
      build();
      expect(component.loaded()).toBe(true);
    });
  });

  describe('updateMds', () => {
    it('counts nothing while every field is empty', () => {
      build();
      component.body = {};
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'people-trained', label: 'Number of people trained', filled: false },
        { key: 'delivery-method', label: 'Delivery method', filled: false },
        { key: 'length-of-training', label: 'Length of training', filled: false },
      ]);
    });

    it('counts a zero participant count as filled, and ignores the attendance answer', () => {
      build();
      component.body = {
        female_using: 0,
        male_using: null,
        non_binary_using: undefined,
        capdev_delivery_method_id: 0,
        capdev_term_id: 3,
        is_attending_for_organization: false,
      };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'people-trained', label: 'Number of people trained', filled: true },
        { key: 'delivery-method', label: 'Delivery method', filled: false },
        { key: 'length-of-training', label: 'Length of training', filled: true },
      ]);
    });

    // The exact path the field's own hint tells the user to take.
    it('satisfies the group from "Unknown" alone, with no gender split at all', () => {
      build();
      component.body = { has_unkown_using: 12 };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([{ key: 'people-trained', label: 'Number of people trained', filled: true }])
      );
    });

    // P2-3382: guards the rule itself, not just the current shape — an optional field added back to
    // this list silently disables Submit, which is how P2-3348 happened.
    it('never tracks the attendance answer, even when it is answered', () => {
      build();
      component.body = { is_attending_for_organization: true, institutions: [{ institutions_id: 1 }] };
      component.updateMds();
      const items = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(items).toHaveLength(3);
      expect(items.map((i: any) => i.key)).toEqual(['people-trained', 'delivery-method', 'length-of-training']);
    });

    it('counts a fully answered form as filled', () => {
      build();
      component.body = {
        female_using: 3,
        male_using: 2,
        non_binary_using: 1,
        capdev_delivery_method_id: 5,
        capdev_term_id: 4,
        is_attending_for_organization: true,
      };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'people-trained', label: 'Number of people trained', filled: true },
        { key: 'delivery-method', label: 'Delivery method', filled: true },
        { key: 'length-of-training', label: 'Length of training', filled: true },
      ]);
    });
  });

  describe('term cascade change handlers', () => {
    it('clears a stale sub-term when switching to the standalone term (3)', () => {
      build();
      component.body = {};
      component.capdevTermId1 = 3;
      component.capdevTermId2 = 2;
      component.onCapdevTermId1Change();
      expect(component.capdevTermId2).toBeNull();
      expect(component.body.capdev_term_id).toBe(3);
    });

    it('keeps the sub-term and derives the saved id from it when the cascade term (4) is selected', () => {
      build();
      component.body = {};
      component.capdevTermId1 = 4;
      component.capdevTermId2 = 2;
      component.onCapdevTermId1Change();
      expect(component.capdevTermId2).toBe(2);
      expect(component.body.capdev_term_id).toBe(2);
    });

    it('saves the parent term id when the cascade term has no sub-term selected yet', () => {
      build();
      component.body = {};
      component.capdevTermId1 = 4;
      component.capdevTermId2 = null;
      component.onCapdevTermId1Change();
      expect(component.body.capdev_term_id).toBe(4);
    });

    it('onCapdevTermId2Change syncs the sub-term into the saved id', () => {
      build();
      component.body = {};
      component.capdevTermId1 = 4;
      component.capdevTermId2 = 1;
      component.onCapdevTermId2Change();
      expect(component.body.capdev_term_id).toBe(1);
    });

    it('triggers an autosave on every cascade change', () => {
      build();
      component.body = {};
      autoSave.schedulePayload.mockClear();
      component.onCapdevTermId1Change();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('onAttendanceChange', () => {
    it('clears the organizations list when attendance is set to No', () => {
      build();
      component.body = { is_attending_for_organization: false, institutions: [{ institutions_id: 1 }] };
      component.onAttendanceChange();
      expect(component.body.institutions).toEqual([]);
    });

    it('keeps the organizations list when attendance is Yes', () => {
      build();
      component.body = { is_attending_for_organization: true, institutions: [{ institutions_id: 1 }] };
      component.onAttendanceChange();
      expect(component.body.institutions).toEqual([{ institutions_id: 1 }]);
    });
  });

  describe('save flow', () => {
    it('onFieldChange updates the MDS tracker and queues a debounced save', () => {
      build();
      component.body = { female_using: 5 };
      component.onFieldChange();
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { female_using: 5 },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' }),
      );
    });

    it('onSave queues an immediate save', () => {
      build();
      component.body = { female_using: 5 };
      component.onSave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { female_using: 5 },
        expect.objectContaining({ debounceMs: 0 }),
      );
    });

    it('tracks the saving state from fieldStatus', () => {
      build();
      expect(component.saving()).toBe(false);
      autoSave.fieldStatus.set({ 'type-specific': 'saving' });
      expect(component.saving()).toBe(true);
    });

    // P2-3556 regression guards: the load gate must not change the happy path in any way.
    it('saves normally once the body has loaded', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(
        of({ response: { female_using: 9, institutions: [{ institutions_id: 7 }] } }),
      );
      build();
      autoSave.schedulePayload.mockClear();

      component.body.male_using = 4;
      component.onFieldChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.female_using).toBe(9);
      expect(payload.male_using).toBe(4);
      expect(payload.institutions).toEqual([{ institutions_id: 7 }]);
    });

    /**
     * The deletion the user actually asked for still goes through. `institutions: []` is what makes
     * the server de-activate every stored organization (`summary.service.ts:460-467`), so the fix
     * must not start omitting or filtering that key — only refuse to send it before the body is
     * known. Removing the last organization (which `onAttendanceChange` also does when attendance
     * flips to No) is a legitimate edit and has to persist.
     */
    it('still sends an empty institutions array once the user removes the last organization', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(
        of({ response: { is_attending_for_organization: true, institutions: [{ institutions_id: 7 }] } }),
      );
      build();
      autoSave.schedulePayload.mockClear();

      component.body.is_attending_for_organization = false;
      component.onAttendanceChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect('institutions' in payload).toBe(true);
      expect(payload.institutions).toEqual([]);
    });
  });

  describe('toggleShowAll', () => {
    it('flips the signal and persists it under the current result id', () => {
      build();
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(true);
      expect(expandableState.setShowAllFields).toHaveBeenCalledWith(123, 'type-specific', true);
      component.toggleShowAll();
      expect(expandableState.setShowAllFields).toHaveBeenLastCalledWith(123, 'type-specific', false);
    });
  });

  /**
   * ── P2-3556 — rendered template ────────────────────────────────────────────────────────────────
   * This runs against the REAL template on purpose: whether the person is told that the section
   * failed to load, and whether the Save button still invites a save that `queueTypeSave` would
   * refuse, are the two things the fix promises on screen. Every other block in this file overrides
   * the template away.
   */
  describe('rendered template (P2-3556)', () => {
    // `app-alert-status` declares plain `@Input()`s while some `app-pr-*` controls use signals, so
    // read both shapes — same helper the sibling section uses.
    const read = (value: any) => (typeof value === 'function' ? value() : value);
    const alerts = () =>
      fixture.debugElement.queryAll(By.css('app-alert-status')).map(d => ({
        status: read(d.componentInstance.status),
        description: read(d.componentInstance.description),
      }));
    const saveButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.tsf-actions button');
    const render = () => {
      build();
      fixture.detectChanges();
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      makeMocks();
      await configure().compileComponents();
    });

    it('renders an error note that says nothing typed will be saved', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(throwError(() => new Error('HTTP 500')));
      render();

      const error = alerts().find(a => a.status === 'error');
      expect(error).toBeDefined();
      expect(error.description).toContain('nothing typed here will be saved');
      expect(error.description).toContain('reported earlier has not been changed');
    });

    // The note sits at the TOP of the field list, above the fields it explains — unlike the sibling
    // Innovation Development section, whose MDS note happens to be the first block of its own
    // template. Here the MDS note is halfway down the form, and an error placed next to it would
    // only be read after the person had already scrolled past every blank field.
    it('keeps the MDS note in place, and puts the error note above it', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(throwError(() => new Error('HTTP 500')));
      render();
      expect(alerts().map(a => a.status)).toEqual(['error', 'info']);
    });

    it('renders no error note on a successful load', () => {
      render();
      expect(alerts().map(a => a.status)).toEqual(['info']);
    });

    // A naive `@if (!loaded())` would flash the error note on every open, while the GET is normal
    // and simply not back yet. The template asks for `=== false` on purpose.
    it('renders no error note while the GET is still in flight — null is not an error', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(new Subject<any>().asObservable());
      render();
      expect(component.loaded()).toBeNull();
      expect(alerts().map(a => a.status)).toEqual(['info']);
    });

    it('disables the Save button when the section could not load', () => {
      bilateralApi.GET_capacityDevelopment.mockReturnValue(throwError(() => new Error('HTTP 500')));
      render();
      expect(saveButton().disabled).toBe(true);
    });

    it('leaves the Save button enabled on the happy path', () => {
      render();
      expect(saveButton().disabled).toBe(false);
    });
  });
});
