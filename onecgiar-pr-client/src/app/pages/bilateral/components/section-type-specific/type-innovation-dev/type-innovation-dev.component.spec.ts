import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { TypeInnovationDevComponent } from './type-innovation-dev.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';

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

  beforeEach(async () => {
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
    innovationControlListSE = {
      typeList: [{ code: 12, name: 'Variety/breed' }],
      readinessLevelsList: [{ id: 17, name: 'Level 6' }],
    };
    bilateralApi = {
      GET_innovationDev: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_innovationDev: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [TypeInnovationDevComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: InnovationControlListService, useValue: innovationControlListSE },
      ],
    })
      .overrideTemplate(TypeInnovationDevComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body and updates the MDS tracker', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(
        of({ response: { short_title: 'T', innovation_nature_id: 3, innovation_developers: 'D', innovation_readiness_level_id: 5 } }),
      );
      build();
      fixture.detectChanges();
      expect(component.body.short_title).toBe('T');
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('type-specific', [
        { key: 'short-title', label: 'Short title', filled: true, invalid: false, invalidReason: undefined },
        { key: 'nature', label: 'Innovation typology (nature)', filled: true },
        { key: 'developers', label: 'Innovation developer', filled: true },
        { key: 'readiness', label: 'Readiness level', filled: true },
      ]);
    });

    // P2-3340: `maxWords` only ever coloured the counter, so a 12-word short title saved unchanged.
    // The field stays "filled" — it IS answered — and is flagged invalid so Submit can refuse and say why.
    it('flags an over-limit short title as invalid without unfilling it', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(
        of({ response: { short_title: 'one two three four five six seven eight nine ten eleven twelve' } }),
      );
      build();
      fixture.detectChanges();

      const shortTitle = mdsTracker.setSectionFields.mock.calls.at(-1)[1][0];
      expect(shortTitle).toEqual({
        key: 'short-title',
        label: 'Short title',
        filled: true,
        invalid: true,
        invalidReason: '12 words; the maximum is 10',
      });
    });

    it('accepts exactly the maximum — the ceiling is inclusive', () => {
      bilateralApi.GET_innovationDev.mockReturnValue(
        of({ response: { short_title: 'one two three four five six seven eight nine ten' } }),
      );
      build();
      fixture.detectChanges();

      expect(mdsTracker.setSectionFields.mock.calls.at(-1)[1][0].invalid).toBe(false);
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

  describe('updateMds', () => {
    it('does not track any of the new Full Metadata fields', () => {
      build();
      component.body = {
        short_title: 'T',
        innovation_nature_id: 12,
        innovation_developers: 'D',
        innovation_readiness_level_id: 17,
        is_new_variety: true,
        number_of_varieties: 3,
        innovation_collaborators: 'Someone',
        evidences_justification: 'Because...',
        has_scaling_studies: true,
      };
      component.updateMds();
      const [, fields] = mdsTracker.setSectionFields.mock.calls[mdsTracker.setSectionFields.mock.calls.length - 1];
      expect(fields.map((f: any) => f.key)).toEqual(['short-title', 'nature', 'developers', 'readiness']);
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
    it('onFieldChange sends every Fase-1 field in the payload', () => {
      build();
      component.body = {
        short_title: 'T',
        innovation_nature_id: 12,
        innovation_developers: 'D',
        innovation_readiness_level_id: 17,
        is_new_variety: true,
        number_of_varieties: 4,
        innovation_collaborators: 'Someone',
        evidences_justification: 'Because...',
        reference_materials: [{ link: 'https://x.org' }],
        has_scaling_studies: true,
        scaling_studies_urls: ['https://y.org'],
      };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        {
          short_title: 'T',
          innovation_nature_id: 12,
          innovation_developers: 'D',
          innovation_readiness_level_id: 17,
          is_new_variety: true,
          number_of_varieties: 4,
          innovation_collaborators: 'Someone',
          evidences_justification: 'Because...',
          reference_materials: [{ link: 'https://x.org' }],
          has_scaling_studies: true,
          scaling_studies_urls: ['https://y.org'],
        },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' }),
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
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        expect.anything(),
        expect.objectContaining({ debounceMs: 0 }),
      );
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
});
