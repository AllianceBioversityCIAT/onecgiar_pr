import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { TypeInnovationDevComponent } from './type-innovation-dev.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';

const MDS_NOTE =
  'The fields displayed on this screen correspond to the minimum data standard (MDS) required for bilateral result reporting. ' +
  'If you need to complete the full metadata for this section, click the button on the right.';

describe('TypeInnovationDevComponent', () => {
  let fixture: ComponentFixture<TypeInnovationDevComponent>;
  let component: TypeInnovationDevComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let innovationControlListSE: any;

  /**
   * P2-3558 — `build()` now RUNS the first change detection, so `ngOnInit` fires and the default
   * `GET_innovationDev` mock (which resolves synchronously) leaves the component `loaded`. Every save
   * is gated on that flag, so a component that was never initialized can no longer save anything —
   * which is the point of the fix, and would otherwise silently neuter every save assertion below.
   */
  const build = () => {
    fixture = TestBed.createComponent(TypeInnovationDevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  const makeMocks = () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = {
      fieldStatus: signal<Record<string, string>>({}),
      schedulePayload: jest.fn()
    };
    // `showScalingStudies` reads `reportingYear()`; without the key every test in this file fails
    // as "is not a function". Default 2025 so the pre-2026 behaviour is what the legacy tests assert.
    creation = {
      currentResultId: signal<number | null>(123),
      reportingYear: signal<number | null>(2025),
      // The Lead contact person doubles as the innovation developer since 2026-09-03.
      resultLeadContact: signal<string>('')
    };
    expandableState = {
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn()
    };
    innovationControlListSE = {
      typeList: [{ code: 12, name: 'Variety/breed' }],
      characteristicsList: [{ id: 1, name: 'Technological' }],
      readinessLevelsList: [{ id: 17, name: 'Level 6' }]
    };
    bilateralApi = {
      GET_innovationDev: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_innovationDev: jest.fn().mockReturnValue(of({}))
    };
  };

  const configure = () =>
    TestBed.configureTestingModule({
      imports: [TypeInnovationDevComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: InnovationControlListService, useValue: innovationControlListSE }
      ]
    });

  beforeEach(async () => {
    makeMocks();
    await configure().overrideTemplate(TypeInnovationDevComponent, '<div></div>').compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body and updates the MDS tracker', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(
        of({ response: { short_title: 'T', innovation_nature_id: 3, innovation_developers: 'D', innovation_readiness_level_id: 5 } })
      );
      build();
      fixture.detectChanges();
      expect(component.body.short_title).toBe('T');
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('type-specific', [
        { key: 'nature', label: 'Innovation typology (nature)', filled: true },
        { key: 'readiness', label: 'Readiness level', filled: true }
      ]);
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
      expect(bilateralApi.GET_innovationDev).not.toHaveBeenCalled();
    });

    it('falls back to an empty body when the response is empty', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.body).toEqual({});
    });

    it('marks the section as loaded once the body is in hand', () => {
      build();
      expect(component.loaded()).toBe(true);
    });

    /**
     * P2-3558 — the data-loss chain, cut at its root.
     *
     * `GET summary/innovation-dev/get/result/:id` answers a server-side exception with a real HTTP 500
     * and the interceptor rethrows it (`shared/interceptors/general-interceptor.service.ts:81-83`), so
     * `next` never ran and `body` stayed the `{}` it was constructed with. The form painted blank with
     * no warning and `buildPayload()`'s `?? null` on every key turned the first keystroke into a wipe
     * of the stored short title, innovation developers and readiness level.
     *
     * These assert on the ABSENCE of a request, which is the only thing that distinguishes the fix
     * from the defect: the old code reached `schedulePayload` on every one of these paths.
     */
    describe('when the GET fails (P2-3558)', () => {
      const failLoad = () => bilateralApi.GET_innovationDev.mockReturnValue(throwError(() => new Error('HTTP 500')));

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

        component.body.short_title = 'typed by the user';
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

      it.each([['addReferenceMaterial'], ['deleteReferenceMaterial'], ['addScalingStudyUrl'], ['deleteScalingStudyUrl']])(
        'sends nothing from %s, the other four write paths',
        method => {
          failLoad();
          build();
          component.body = { reference_materials: [{ link: 'a' }], scaling_studies_urls: ['a'] };
          autoSave.schedulePayload.mockClear();

          (component as any)[method](0);

          expect(autoSave.schedulePayload).not.toHaveBeenCalled();
        }
      );

      // Same reason as the sibling section (P2-3355): publishing no checklist at all leaves the
      // section at "0/0 fields", which reads as "nothing required here" instead of as incomplete.
      it('still publishes the two unfilled MDS items, so the section stays honestly incomplete', () => {
        failLoad();
        build();
        const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
        expect(fields.map((f: any) => f.key)).toEqual(['nature', 'readiness']);
        expect(fields.every((f: any) => f.filled === false)).toBe(true);
      });
    });

    /**
     * P2-3558, the secondary window: on prtest the GET takes 240-620 ms against an 800 ms autosave
     * debounce, so an edit could reach the PATCH before the body ever arrived — and a payload built
     * from `{}` blanks the record exactly as a failed load does. `null` therefore blocks too.
     */
    describe('while the GET is still in flight (P2-3558)', () => {
      it('sends nothing before the body arrives, and saves normally afterwards', () => {
        const inFlight = new Subject<any>();
        bilateralApi.GET_innovationDev.mockReturnValue(inFlight.asObservable());
        build();

        expect(component.loaded()).toBeNull();
        component.body.short_title = 'typed too early';
        component.onFieldChange();
        expect(autoSave.schedulePayload).not.toHaveBeenCalled();

        inFlight.next({ response: { short_title: 'stored', innovation_developers: 'D' } });
        expect(component.loaded()).toBe(true);

        component.onFieldChange();
        expect(autoSave.schedulePayload).toHaveBeenCalledTimes(1);
      });
    });
  });

  // P2-3391 AC9/AC10 — the green check is exactly the three MDS fields the story names.
  describe('updateMds', () => {
    const trackedKeys = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1].map((f: any) => f.key);

    it('tracks only the two MDS fields, never the full metadata ones', () => {
      build();
      component.body = {
        short_title: 'T',
        innovation_characterization_id: 1,
        innovation_nature_id: 12,
        innovation_developers: 'D',
        innovation_readiness_level_id: 17,
        is_new_variety: true,
        number_of_varieties: 3,
        innovation_collaborators: 'Someone',
        evidences_justification: 'Because...',
        has_scaling_studies: true
      };
      component.updateMds();
      expect(trackedKeys()).toEqual(['nature', 'readiness']);
    });

    it('reaches 100% on the two MDS fields alone, with no short title and no developer', () => {
      build();
      component.body = { innovation_nature_id: 12, innovation_readiness_level_id: 17 };
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.every((f: any) => f.filled)).toBe(true);
    });

    it.each([
      ['nature', { innovation_readiness_level_id: 17 }],
      ['readiness', { innovation_nature_id: 12 }]
    ])('leaves %s unfilled when it is missing, so the section cannot go green', (key, body) => {
      build();
      component.body = body;
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.find((f: any) => f.key === key).filled).toBe(false);
    });

    // Nicoleta Trifa via Ángel Jarrín, 2026-09-03: the Innovation Developer is the Lead contact person.
    it('sends the lead contact person as the innovation developer', () => {
      creation.resultLeadContact.set('Jane Smith');
      build();
      component.body = { innovation_nature_id: 12, innovation_developers: 'old free text' };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        expect.objectContaining({ innovation_developers: 'Jane Smith' }),
        expect.anything()
      );
    });

    it('keeps the stored developer when the result has no lead contact yet', () => {
      build();
      component.body = { innovation_developers: 'stored' };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        expect.objectContaining({ innovation_developers: 'stored' }),
        expect.anything()
      );
    });

    // P2-3340 still holds even though the short title moved to full metadata: it is reported only
    // while it breaks the ceiling, as `filled: true`, so Submit refuses without ever blocking AC9.
    it('flags an over-limit short title as invalid without adding an unfilled slot', () => {
      build();
      component.body = { short_title: 'one two three four five six seven eight nine ten eleven twelve' };
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.at(-1)).toEqual({
        key: 'short-title',
        label: 'Short title',
        filled: true,
        invalid: true,
        invalidReason: '12 words; the maximum is 10'
      });
    });

    it('accepts exactly the maximum — the ceiling is inclusive — and tracks nothing for it', () => {
      build();
      component.body = { short_title: 'one two three four five six seven eight nine ten' };
      component.updateMds();
      expect(trackedKeys()).toEqual(['nature', 'readiness']);
    });
  });

  describe('gates', () => {
    it('isVarietyType is true only for the variety/breed nature id (12)', () => {
      build();
      component.body = { innovation_nature_id: 12 };
      expect(component.isVarietyType).toBe(true);
      component.body = { innovation_nature_id: 3 };
      expect(component.isVarietyType).toBe(false);
    });

    it('isReadyForScalingStudies is true only at readiness level 17 (Level_6) or above', () => {
      build();
      component.body = { innovation_readiness_level_id: 17 };
      expect(component.isReadyForScalingStudies).toBe(true);
      component.body = { innovation_readiness_level_id: 20 };
      expect(component.isReadyForScalingStudies).toBe(true);
      component.body = { innovation_readiness_level_id: 16 };
      expect(component.isReadyForScalingStudies).toBe(false);
      component.body = {};
      expect(component.isReadyForScalingStudies).toBe(false);
    });

    /**
     * P2-3265 — the phase gate, on the reporting phase YEAR and never on the portfolio.
     * `isReadyForScalingStudies` stays the pre-2026 level rule; `showScalingStudies` is what the
     * template asks.
     */
    it('showScalingStudies keeps the level rule for phases up to 2025', () => {
      build();
      component.body = { innovation_readiness_level_id: 17 };
      creation.reportingYear.set(2025);
      expect(component.showScalingStudies).toBe(true);
      component.body = { innovation_readiness_level_id: 16 };
      expect(component.showScalingStudies).toBe(false);
    });

    it('showScalingStudies is false from the 2026 phase on, at EVERY readiness level', () => {
      build();
      creation.reportingYear.set(2026);
      for (const level of [16, 17, 20]) {
        component.body = { innovation_readiness_level_id: level };
        expect(component.showScalingStudies).toBe(false);
      }
      creation.reportingYear.set(2027);
      component.body = { innovation_readiness_level_id: 17 };
      expect(component.showScalingStudies).toBe(false);
    });

    it('showScalingStudies treats an unresolved phase year as the current phase and hides it', () => {
      build();
      creation.reportingYear.set(null);
      component.body = { innovation_readiness_level_id: 17 };
      expect(component.showScalingStudies).toBe(false);
    });
  });

  describe('reference material links', () => {
    it('adds a new empty link, initializing the array if absent', () => {
      build();
      component.body = {};
      component.addReferenceMaterial();
      expect(component.body.reference_materials).toEqual([{ link: '' }]);
    });

    it('deletes a link by index', () => {
      build();
      component.body = { reference_materials: [{ link: 'a' }, { link: 'b' }] };
      component.deleteReferenceMaterial(0);
      expect(component.body.reference_materials).toEqual([{ link: 'b' }]);
    });

    it('triggers autosave on add and delete', () => {
      build();
      component.body = { reference_materials: [{ link: 'a' }] };
      autoSave.schedulePayload.mockClear();
      component.addReferenceMaterial();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
      autoSave.schedulePayload.mockClear();
      component.deleteReferenceMaterial(0);
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('scaling study url links', () => {
    it('adds a new empty url, initializing the array if absent', () => {
      build();
      component.body = {};
      component.addScalingStudyUrl();
      expect(component.body.scaling_studies_urls).toEqual(['']);
    });

    it('deletes a url by index', () => {
      build();
      component.body = { scaling_studies_urls: ['a', 'b'] };
      component.deleteScalingStudyUrl(0);
      expect(component.body.scaling_studies_urls).toEqual(['b']);
    });
  });

  describe('save flow', () => {
    it('onFieldChange sends every MDS and full metadata field in the payload', () => {
      build();
      component.body = {
        short_title: 'T',
        innovation_characterization_id: 2,
        innovation_nature_id: 12,
        innovation_developers: 'D',
        innovation_readiness_level_id: 17,
        is_new_variety: true,
        number_of_varieties: 4,
        innovation_collaborators: 'Someone',
        evidences_justification: 'Because...',
        reference_materials: [{ link: 'https://x.org' }],
        has_scaling_studies: true,
        scaling_studies_urls: ['https://y.org']
      };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        {
          short_title: 'T',
          innovation_characterization_id: 2,
          innovation_nature_id: 12,
          innovation_developers: 'D',
          innovation_readiness_level_id: 17,
          is_new_variety: true,
          number_of_varieties: 4,
          innovation_collaborators: 'Someone',
          evidences_justification: 'Because...',
          reference_materials: [{ link: 'https://x.org' }],
          has_scaling_studies: true,
          scaling_studies_urls: ['https://y.org']
        },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' })
      );
    });

    it('omits the PK when creating, includes it when editing', () => {
      build();
      component.body = {};
      component.onSave();
      let [, payload] = autoSave.schedulePayload.mock.calls[0];
      expect(payload.result_innovation_dev_id).toBeUndefined();

      component.body = { result_innovation_dev_id: 9 };
      component.onSave();
      [, payload] = autoSave.schedulePayload.mock.calls[1];
      expect(payload.result_innovation_dev_id).toBe(9);
    });

    /**
     * P2-3557 — the server treats an ABSENT `reference_materials` as "leave the column alone" and any
     * present value, `[]` included, as "de-activate every stored evidence of type 4 that is not in
     * here" (`results/summary/innovation_dev.service.ts:99-125`). So these three cases assert the
     * KEY's presence, never its value: `toBeUndefined()` would also pass against the old
     * `reference_materials: this.body.reference_materials ?? []`, because a key holding `undefined`
     * disappears from the JSON too.
     */
    describe('reference_materials is omitted, never emptied (P2-3557)', () => {
      it('omits the key entirely when the body never loaded (failed or in-flight GET)', () => {
        build();
        component.body = {};
        component.onSave();
        const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
        expect('reference_materials' in payload).toBe(false);
      });

      it('omits the key when the body carries something that is not an array', () => {
        build();
        component.body = { reference_materials: null };
        component.onSave();
        const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
        expect('reference_materials' in payload).toBe(false);
      });

      it('still sends the links the user has on screen', () => {
        build();
        component.body = { reference_materials: [{ link: 'https://a.org' }, { link: 'https://b.org' }] };
        component.onSave();
        const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
        expect('reference_materials' in payload).toBe(true);
        expect(payload.reference_materials).toEqual([{ link: 'https://a.org' }, { link: 'https://b.org' }]);
      });

      it('still sends an empty array once the user deletes the last link, so the deletion persists', () => {
        build();
        component.body = { reference_materials: [{ link: 'https://a.org' }] };
        component.deleteReferenceMaterial(0);
        const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
        expect('reference_materials' in payload).toBe(true);
        expect(payload.reference_materials).toEqual([]);
      });
    });

    // P2-3558 regression guard: the happy path must be untouched by the load gate.
    it('saves normally once the body has loaded', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(of({ response: { short_title: 'stored', innovation_developers: 'D' } }));
      build();
      autoSave.schedulePayload.mockClear();

      component.body.short_title = 'edited';
      component.onFieldChange();

      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.short_title).toBe('edited');
      expect(payload.innovation_developers).toBe('D');
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

  // ── P2-3391 / P2-3327 — rendered template ───────────────────────────────────────────────────────
  // These run against the real template on purpose: the note copy, the button label and the
  // required/optional split are the acceptance criteria themselves, not an implementation detail.
  describe('rendered template', () => {
    // `app-pr-input`/`app-pr-select`/`app-pr-textarea` declare their inputs as signals while
    // `app-pr-radio-button` still uses plain `@Input()`s, so read both shapes.
    const read = (value: any) => (typeof value === 'function' ? value() : value);
    const fieldsOf = (selector: string) =>
      fixture.debugElement.queryAll(By.css(selector)).map(d => ({
        label: read(d.componentInstance.label),
        required: read(d.componentInstance.required)
      }));
    const allFields = () => [
      ...fieldsOf('app-pr-input'),
      ...fieldsOf('app-pr-select'),
      ...fieldsOf('app-pr-textarea'),
      ...fieldsOf('app-pr-radio-button')
    ];
    const labels = () => allFields().map(f => f.label);
    const toggleButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.tsf-fields > div:first-child button');
    const render = () => {
      build();
      fixture.detectChanges();
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      makeMocks();
      await configure().compileComponents();
    });

    /**
     * P2-3558 — the person must be TOLD. Before this, a failed load painted an ordinary empty form:
     * indistinguishable from a result nobody had filled in yet, which is what made them start typing
     * over a record they could not see.
     */
    describe('failed load (P2-3558)', () => {
      const alerts = () =>
        fixture.debugElement.queryAll(By.css('app-alert-status')).map(d => ({
          status: read(d.componentInstance.status),
          description: read(d.componentInstance.description)
        }));
      const saveButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.tsf-actions button');

      it('renders an error note that says nothing typed will be saved', () => {
        bilateralApi.GET_innovationDev.mockReturnValue(throwError(() => new Error('HTTP 500')));
        render();

        const error = alerts().find(a => a.status === 'error');
        expect(error).toBeDefined();
        expect(error.description).toContain('nothing typed here will be saved');
        expect(error.description).toContain('reported earlier has not been changed');
      });

      it('keeps the MDS note in place — the error note is added, not swapped in', () => {
        bilateralApi.GET_innovationDev.mockReturnValue(throwError(() => new Error('HTTP 500')));
        render();
        expect(alerts().map(a => a.status)).toEqual(['info', 'error']);
      });

      it('renders no error note on a successful load', () => {
        render();
        expect(alerts().map(a => a.status)).toEqual(['info']);
      });

      // A naive `@if (!loaded())` would flash the error note on every open, while the GET is normal
      // and simply not back yet. The template asks for `=== false` on purpose.
      it('renders no error note while the GET is still in flight — null is not an error', () => {
        bilateralApi.GET_innovationDev.mockReturnValue(new Subject<any>().asObservable());
        render();
        expect(component.loaded()).toBeNull();
        expect(alerts().map(a => a.status)).toEqual(['info']);
      });

      it('disables the Save button when the section could not load', () => {
        bilateralApi.GET_innovationDev.mockReturnValue(throwError(() => new Error('HTTP 500')));
        render();
        expect(saveButton().disabled).toBe(true);
      });

      it('leaves the Save button enabled on the happy path', () => {
        render();
        expect(saveButton().disabled).toBe(false);
      });
    });

    it('shows the MDS note with the exact wording the story requires', () => {
      render();
      const alert = fixture.debugElement.query(By.css('app-alert-status'));
      expect(read(alert.componentInstance.description)).toBe(MDS_NOTE);
      expect(read(alert.componentInstance.status)).toBe('info');
    });

    it('puts the note and the button in the first row of the section, button to the right', () => {
      render();
      const row: HTMLElement = fixture.nativeElement.querySelector('.tsf-fields').firstElementChild;
      expect(row.className).toContain('justify-between');
      expect(row.querySelector('app-alert-status')).toBeTruthy();
      const children = Array.from(row.children).map(c => c.tagName.toLowerCase());
      expect(children).toEqual(['app-alert-status', 'button']);
    });

    it('labels the button "Complete full metadata" while collapsed and "Hide full metadata" once expanded', () => {
      render();
      expect(toggleButton().textContent.trim()).toBe('Complete full metadata');
      toggleButton().click();
      fixture.detectChanges();
      expect(toggleButton().textContent.trim()).toBe('Hide full metadata');
    });

    // No "Innovation Developer" field since 2026-09-03: the Lead contact person (Section 1) is the developer.
    it('shows the two MDS fields without expanding anything, and marks them required', () => {
      render();
      expect(labels()).toEqual(['Which of the below typologies best fits the nature of the innovation?']);
      expect(allFields().every(f => f.required)).toBe(true);
      // The readiness level is an `app-pr-range-level`, headed by its own field header.
      expect(fixture.debugElement.query(By.css('app-pr-range-level'))).toBeTruthy();
      const headers = fixture.debugElement.queryAll(By.css('app-pr-field-header')).map(d => read(d.componentInstance.label));
      expect(headers).toContain('How would you assess the current readiness of this innovation?');
    });

    it('reveals the full metadata fields on click and hides them again, in the pooled-funding order', () => {
      render();
      const collapsed = labels();

      toggleButton().click();
      fixture.detectChanges();
      const expanded = labels();

      expect(expanded.length).toBeGreaterThan(collapsed.length);
      expect(expanded).toEqual(
        expect.arrayContaining([
          'Short title',
          'What would be the best way to characterize this innovation?',
          'Innovation collaborators',
          'Please provide a brief explanation that explains how the provided evidence (inputted in the Evidence section) justifies the chosen innovation readiness level'
        ])
      );
      expect(expanded.indexOf('Short title')).toBeLessThan(expanded.indexOf('What would be the best way to characterize this innovation?'));

      toggleButton().click();
      fixture.detectChanges();
      expect(labels()).toEqual(collapsed);
    });

    it('keeps every revealed full metadata field strictly optional', () => {
      render();
      const mdsLabels = labels();

      toggleButton().click();
      fixture.detectChanges();

      const revealed = allFields().filter(f => !mdsLabels.includes(f.label));
      expect(revealed.length).toBeGreaterThan(0);
      expect(revealed.filter(f => f.required)).toEqual([]);
    });

    it('keeps the scaling studies question optional too, once the readiness gate opens', () => {
      render();
      component.body = { innovation_readiness_level_id: 17 };
      toggleButton().click();
      fixture.detectChanges();

      const scaling = allFields().find(f => typeof f.label === 'string' && f.label.startsWith('Have any studies been conducted'));
      expect(scaling).toBeDefined();
      expect(scaling.required).toBe(false);
    });

    it('preserves the values typed in full metadata when the block is collapsed', () => {
      render();
      toggleButton().click();
      fixture.detectChanges();

      component.body.innovation_collaborators = 'Ada Lovelace (ada@x.org)';
      component.body.short_title = 'Drought tolerant beans';
      toggleButton().click();
      fixture.detectChanges();

      expect(component.body.innovation_collaborators).toBe('Ada Lovelace (ada@x.org)');
      expect(component.body.short_title).toBe('Drought tolerant beans');
      // ...and they still travel in the payload while hidden.
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.innovation_collaborators).toBe('Ada Lovelace (ada@x.org)');
      expect(payload.short_title).toBe('Drought tolerant beans');
    });

    /**
     * P2-3265 — asserts on the RENDERED question, not on the getter. A getter-only assertion passes
     * even if the template still reads the old flag, which is exactly how this surface was missed
     * when the W1/W2 and Innovation Use forms were changed.
     */
    it('does NOT render the scaling-studies question for a 2026 result, at a level where 2025 shows it', () => {
      creation.reportingYear.set(2026);
      render();
      component.body = { innovation_readiness_level_id: 17 };
      toggleButton().click();
      fixture.detectChanges();

      const scaling = allFields().find(f => typeof f.label === 'string' && f.label.startsWith('Have any studies been conducted'));
      expect(scaling).toBeUndefined();
    });

    it('still renders it for a 2025 result at the same level — previous phases are untouched', () => {
      creation.reportingYear.set(2025);
      render();
      component.body = { innovation_readiness_level_id: 17 };
      toggleButton().click();
      fixture.detectChanges();

      const scaling = allFields().find(f => typeof f.label === 'string' && f.label.startsWith('Have any studies been conducted'));
      expect(scaling).toBeDefined();
    });

    /**
     * The PO's epic note (Ángel Jarrín, 23-Aug-2026) is explicit: "Remove" never means delete the data.
     * The question stops being asked, but the stored answer must keep travelling in the payload so a
     * value written in an earlier phase is never blanked by a save from the 2026 form.
     */
    it('keeps the stored scaling answer in the payload even when the question is hidden', () => {
      creation.reportingYear.set(2026);
      render();
      component.body.innovation_readiness_level_id = 17;
      component.body.has_scaling_studies = true;
      component.body.scaling_studies_urls = ['https://example.org/study'];

      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload.has_scaling_studies).toBe(true);
      expect(payload.scaling_studies_urls).toEqual(['https://example.org/study']);
    });
  });
});
