import { readFileSync } from 'fs';
import { join } from 'path';

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
import { InnovationUseResultsService } from '../../../../../shared/services/global/innovation-use-results.service';

describe('TypeInnovationUseComponent', () => {
  let fixture: ComponentFixture<TypeInnovationUseComponent>;
  let component: TypeInnovationUseComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let innovationControlListSE: any;
  let innovationUseResultsSE: any;

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
    creation = { currentResultId: signal<number | null>(123), reportingYear: signal<number | null>(2026) };
    expandableState = {
      getShowAllFields: jest.fn().mockReturnValue(false),
      setShowAllFields: jest.fn(),
    };
    // Mirrors `GET /v2/clarisa/innovation-use-levels`: `id` is what the form stores, `level` is the number
    // the scaling-studies and explanation gates read.
    innovationControlListSE = {
      useLevelsList: [
        { id: '1', level: 0, name: 'No use' },
        { id: '4', level: 3, name: 'Level 3' },
        { id: '6', level: 5, name: 'Level 5' },
        { id: '7', level: 6, name: 'Level 6' },
      ],
    };
    innovationUseResultsSE = { resultsList: [] };
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
        { provide: InnovationUseResultsService, useValue: innovationUseResultsSE },
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

  describe('updateMds — P2-3428 / P2-3331 AC1: the MDS fields published to the tracker', () => {
    const ACTORS = {
      key: 'use-actors',
      label: 'Actors',
    };
    const MEASURES = {
      key: 'use-measures',
      label: 'Other quantitative measures of innovation use',
    };
    const LEVEL = {
      key: 'use-level',
      label: 'How would you assess the current use level of the innovation?',
    };
    const INVESTMENT = {
      key: 'use-investment',
      label: 'Estimated total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period',
    };

    const lastFields = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1];

    it('declares the published MDS fields and nothing else, all empty on a blank section', () => {
      build();
      component.body = {};
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { ...ACTORS, filled: false },
        { ...MEASURES, filled: false },
        { ...LEVEL, filled: false },
      ]);
    });

    it('no longer declares the old use-determined entry', () => {
      build();
      component.body = { innov_use_to_be_determined: true };
      component.updateMds();
      expect(lastFields().map((f: any) => f.key)).toEqual(['use-actors', 'use-measures', 'use-level']);
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

    it('AC7 — counts the use level once set', () => {
      build();
      component.body = { innovation_use_level_id: '6' };
      component.updateMds();
      expect(lastFields()).toContainEqual({ ...LEVEL, filled: true });
    });

    // 🛑 26-ago-2026 — AC8 asks for an editable, required investment amount, and the server cannot store
    // one. A red asterisk on a field the endpoint discards makes the user type a number that vanishes on
    // the next reload with no warning, so the field follows the house rule instead: VISIBLE BUT DISABLED
    // with a `Coming soon` tag (same markup as `result-ai-item.component.html`). Do NOT re-add
    // `[required]="true"` until the amount can actually be persisted — see the TODO in updateMds().
    it('AC8 — the investment amount is rendered disabled and tagged Coming soon, never as required', () => {
      const html = readFileSync(join(__dirname, 'type-innovation-use.component.html'), 'utf8');
      const field = html.slice(
        html.indexOf('Estimated total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period'),
      );
      const input = field.slice(0, field.indexOf('</app-pr-input>'));
      expect(input).toContain('[required]="false"');
      expect(input).not.toContain('[required]="true"');
      expect(input).toContain('[disabled]="true"');
      expect(input).toContain('type="currency"');
      expect(input).toContain('[(ngModel)]="body.investment_bilateral_usd"');
      // The tag sits beside the input, before the MDS note row that closes the always-visible block.
      const block = field.slice(0, field.indexOf('mdsInfoNote'));
      expect(block).toContain('data-testid="use-investment-coming-soon"');
      expect(block).toContain('Coming soon');
    });

    it('never sends investment_bilateral_usd in the payload — the server has no column for it', () => {
      build();
      component.body = { investment_bilateral_usd: 15000 };
      component.onSave();
      const [, payload] = autoSave.schedulePayload.mock.calls.at(-1);
      expect(payload).not.toHaveProperty('investment_bilateral_usd');
    });

    // 🛑 DO NOT "fix" this by adding the item back.
    // 25-ago-2026: `investment_bilateral_usd` does not exist on the server (zero hits in
    // `onecgiar-pr-server/src/`) and the legacy endpoint this section saves through has no
    // `ValidationPipe`, so the key is discarded with no error. Publish it to the tracker and the item
    // reads as unfilled again after every reload, leaving Submit blocked with no way for the user to
    // unblock it — the form becomes uncompletable. Storing it needs `PATCH /v2/api/innovation-use/...`,
    // which models the amount PER PROJECT and expects the 0-9 level in `innovation_use_level_id`, and
    // the story does not define how to split one total across several contributing projects.
    // The field stays mandatory ON SCREEN; it just does not gate Submit.
    it('does NOT publish use-investment to the MDS tracker, because it cannot be persisted yet', () => {
      build();
      component.body = { investment_bilateral_usd: 15000 };
      component.updateMds();
      expect(lastFields().map((f: any) => f.key)).toEqual(['use-actors', 'use-measures', 'use-level']);
      expect(lastFields().some((f: any) => f.key === INVESTMENT.key)).toBe(false);
    });

    it('AC14 — the published MDS fields alone are enough to complete the section', () => {
      build();
      component.body = {
        innov_use_to_be_determined: false,
        actors: [{ actor_type_id: 1, is_active: true }],
        measures: [{ unit_of_measure: 'ha', quantity: 3, is_active: true }],
        innovation_use_level_id: '6',
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
        linked_result_id: 42,
      };
      component.updateMds();
      expect(lastFields()).toEqual(before);
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
        expect.objectContaining({
          innov_use_to_be_determined: false,
          innovation_use_level_id: 5,
          innovatonUse: {
            actors: [{ actor_type_id: 1 }],
            organization: [{ institution_types_id: 2 }],
            measures: [{ unit_of_measure: 'ha' }],
          },
        }),
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

  describe('MDS info note — P2-3428 AC1 / P2-3331 AC2', () => {
    it('exposes the note verbatim, as the story and QA quote it', () => {
      build();
      expect(component.mdsInfoNote).toBe(
        'The fields displayed on this screen correspond to the minimum data standard (MDS) required for bilateral result reporting. ' +
          'If you need to complete the full metadata for this section, click the button on the right.',
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
        scaling_studies_urls: ['https://a.b'],
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
          scaling_studies_urls: ['https://example.org/a', 'https://example.org/b'],
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
          scaling_studies_urls: ['https://example.org/a'],
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
          scaling_studies_urls: ['https://example.org/a'],
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
    const rows = [
      { id: '1', name: 'Innovation development', title: 'QA-ed innovation', status_id: 2 },
      { id: '2', name: 'Innovation development', title: 'Still editing', status_id: 1 },
      { id: '3', name: 'Innovation development', title: 'Submitted, not QA-ed', status_id: 3 },
      { id: '4', name: 'Innovation use', title: 'Wrong result type', status_id: 2 },
      { id: '5', name: 'Knowledge product', title: 'Wrong result type too', status_id: 2 },
    ];

    it('keeps only Innovation Development results whose status is Quality Assessed (status_id = 2)', () => {
      innovationUseResultsSE.resultsList = rows;
      build();
      expect(component.qaInnovationDevelopmentResults.map((r: any) => r.id)).toEqual(['1']);
    });

    it('drops every non Innovation Development result type', () => {
      innovationUseResultsSE.resultsList = rows;
      build();
      expect(component.qaInnovationDevelopmentResults.some((r: any) => r.name !== 'Innovation development')).toBe(false);
    });

    it('lets an option through when the catalog carries no status_id at all (current endpoint payload)', () => {
      // The live catalog (`getResultsForInnovUse`) selects no status column, so the QA gate cannot bite yet.
      // Filtering these out would render a permanently empty dropdown; see the component comment.
      innovationUseResultsSE.resultsList = [{ id: '9', name: 'Innovation development', title: 'No status in payload' }];
      build();
      expect(component.qaInnovationDevelopmentResults.map((r: any) => r.id)).toEqual(['9']);
    });

    it('tolerates an empty catalog', () => {
      innovationUseResultsSE.resultsList = null;
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
      expect(keys).toHaveLength(3);
    });

    it('hydrates the single selection out of the stored linked_results list', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { has_innovation_link: 1, linked_results: [{ id: 77 }] } }),
      );
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

  // P2-3424 — the endpoint now stores and returns these fields, so what the user typed has to come back
  // usable. MySQL hands `tinyint` columns over as 1/0 and the radios bind true/false.
  describe('P2-3424 — reload of the fields the endpoint now persists', () => {
    it('normalizes the stored tinyint answers into the booleans the radios bind', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { has_scaling_studies: 1, innov_use_2030_to_be_determined: 0, has_innovation_link: 0 } }),
      );
      build();
      fixture.detectChanges();
      expect(component.body.has_scaling_studies).toBe(true);
      expect(component.body.innov_use_2030_to_be_determined).toBe(false);
      expect(component.body.has_innovation_link).toBe(false);
    });

    it('leaves an unanswered question unanswered instead of turning it into a No', () => {
      bilateralApi.GET_innovationUse.mockReturnValue(
        of({ response: { has_scaling_studies: null, innov_use_2030_to_be_determined: null } }),
      );
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
            readiness_level_explanation: 'Because the evidence says so.',
          },
        }),
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
        readiness_level_explanation: 'Because the evidence says so.',
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
