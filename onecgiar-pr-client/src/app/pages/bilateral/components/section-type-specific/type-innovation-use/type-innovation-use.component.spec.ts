import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { TypeInnovationUseComponent } from './type-innovation-use.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';

describe('TypeInnovationUseComponent', () => {
  let fixture: ComponentFixture<TypeInnovationUseComponent>;
  let component: TypeInnovationUseComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let innovationControlListSE: any;

  const build = () => {
    fixture = TestBed.createComponent(TypeInnovationUseComponent);
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
    innovationControlListSE = { useLevelsList: [{ id: 5, name: 'Level 5' }] };
    bilateralApi = {
      GET_actorsTypes: jest.fn().mockReturnValue(of({ response: [{ actor_type_id: 1, name: 'Farmer' }] })),
      GET_institutionsTypeTree: jest.fn().mockReturnValue(
        of({
          response: [
            { code: 10, name: 'Government', childrens: [{ code: 11, name: 'Ministry' }] },
            { code: 20, name: 'Private sector', childrens: [] },
          ],
        }),
      ),
      GET_innovationUse: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_innovationUse: jest.fn().mockReturnValue(of({})),
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
      ],
    })
      .overrideTemplate(TypeInnovationUseComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body and the actor types catalog', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { innov_use_to_be_determined: false, innovation_use_level_id: 5 } }),
      );
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
      expect(component.body).toEqual({});
      expect(component.actorsTypeList).toEqual([]);
      expect(component.institutionsTypeTreeList).toEqual([]);
    });

    it('loads the institution type tree catalog', () => {
      build();
      fixture.detectChanges();
      expect(component.institutionsTypeTreeList).toEqual([
        { code: 10, name: 'Government', childrens: [{ code: 11, name: 'Ministry' }] },
        { code: 20, name: 'Private sector', childrens: [] },
      ]);
    });

    it('splits a hydrated parent_institution_type_id back into a parent/sub-type pair', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { organization: [{ institution_types_id: 11, parent_institution_type_id: 10 }] } }),
      );
      build();
      fixture.detectChanges();
      expect(component.body.organization[0]).toMatchObject({ institution_types_id: 10, institution_sub_type_id: 11 });
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
        actors: [{ actor_type_id: 1, is_active: true }, { actor_type_id: 2, is_active: false }, { actor_type_id: 3 }],
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

    it('clears every count field when the disaggregation toggle flips', () => {
      build();
      const actor = { women: 1, women_youth: 2, men: 3, men_youth: 4, how_many: 5 };
      component.onDisaggregationChange(actor);
      expect(actor).toMatchObject({ women: null, women_youth: null, men: null, men_youth: null, how_many: null });
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

  describe('visibleOrganizations / visibleMeasures', () => {
    it('exclude soft-deleted rows and tolerate an absent array', () => {
      build();
      component.body = {
        organization: [{ institution_types_id: 1, is_active: true }, { institution_types_id: 2, is_active: false }],
      };
      expect(component.visibleOrganizations).toEqual([{ institution_types_id: 1, is_active: true }]);
      component.body = {};
      expect(component.visibleOrganizations).toEqual([]);

      component.body = { measures: [{ unit_of_measure: 'ha', is_active: true }, { unit_of_measure: 'kg', is_active: false }] };
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

  describe('updateMds', () => {
    it('counts nothing while every field is empty', () => {
      build();
      component.body = {};
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'use-determined', label: 'Use to be determined', filled: false },
        { key: 'use-actors', label: 'Actors / users', filled: false },
        {
          key: 'use-level',
          label: 'How would you assess the current use level of the innovation?',
          filled: false,
        },
      ]);
    });

    it('counts use-actors as filled when use is to-be-determined, even without any actor', () => {
      build();
      component.body = { innov_use_to_be_determined: true };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([{ key: 'use-actors', label: 'Actors / users', filled: true }]),
      );
    });

    it('counts use-actors as filled once at least one active actor exists', () => {
      build();
      component.body = { innov_use_to_be_determined: false, actors: [{ actor_type_id: 1, is_active: true }] };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([{ key: 'use-actors', label: 'Actors / users', filled: true }]),
      );
    });

    it('ignores soft-deleted actors when counting use-actors', () => {
      build();
      component.body = { innov_use_to_be_determined: false, actors: [{ actor_type_id: 1, is_active: false }] };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([{ key: 'use-actors', label: 'Actors / users', filled: false }]),
      );
    });

    it('counts the use level once set', () => {
      build();
      component.body = { innovation_use_level_id: 5 };
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([
          {
            key: 'use-level',
            label: 'How would you assess the current use level of the innovation?',
            filled: true,
          },
        ]),
      );
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
        measures: [{ unit_of_measure: 'ha' }],
      };
      component.onFieldChange();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        {
          innov_use_to_be_determined: false,
          innovation_use_level_id: 5,
          innovatonUse: {
            actors: [{ actor_type_id: 1 }],
            organization: [{ institution_types_id: 2 }],
            measures: [{ unit_of_measure: 'ha' }],
          },
        },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' }),
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
