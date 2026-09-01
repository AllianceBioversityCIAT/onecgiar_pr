import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
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

  const build = () => {
    fixture = TestBed.createComponent(TypeInnovationDevComponent);
    component = fixture.componentInstance;
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
    creation = { currentResultId: signal<number | null>(123), reportingYear: signal<number | null>(2025) };
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
        { key: 'developers', label: 'Innovation developer', filled: true },
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
  });

  // P2-3391 AC9/AC10 — the green check is exactly the three MDS fields the story names.
  describe('updateMds', () => {
    const trackedKeys = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1].map((f: any) => f.key);

    it('tracks only the three MDS fields, never the full metadata ones', () => {
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
      expect(trackedKeys()).toEqual(['nature', 'developers', 'readiness']);
    });

    it('reaches 100% on the three MDS fields alone, with no short title at all', () => {
      build();
      component.body = { innovation_nature_id: 12, innovation_developers: 'D', innovation_readiness_level_id: 17 };
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.every((f: any) => f.filled)).toBe(true);
    });

    it.each([
      ['nature', { innovation_developers: 'D', innovation_readiness_level_id: 17 }],
      ['developers', { innovation_nature_id: 12, innovation_readiness_level_id: 17 }],
      ['readiness', { innovation_nature_id: 12, innovation_developers: 'D' }]
    ])('leaves %s unfilled when it is missing, so the section cannot go green', (key, body) => {
      build();
      component.body = body;
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.find((f: any) => f.key === key).filled).toBe(false);
    });

    it('treats a whitespace-only innovation developer as unfilled', () => {
      build();
      component.body = { innovation_developers: '   ' };
      component.updateMds();
      const fields = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      expect(fields.find((f: any) => f.key === 'developers').filled).toBe(false);
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
      expect(trackedKeys()).toEqual(['nature', 'developers', 'readiness']);
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

    it('shows the three MDS fields without expanding anything, and marks all three required', () => {
      render();
      expect(labels()).toEqual(['Which of the below typologies best fits the nature of the innovation?', 'Innovation Developer']);
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
