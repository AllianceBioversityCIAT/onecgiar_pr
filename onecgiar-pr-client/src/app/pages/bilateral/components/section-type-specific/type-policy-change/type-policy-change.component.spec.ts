import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { TypePolicyChangeComponent } from './type-policy-change.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { PolicyControlListService } from '../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';

describe('TypePolicyChangeComponent', () => {
  let fixture: ComponentFixture<TypePolicyChangeComponent>;
  let component: TypePolicyChangeComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let expandableState: any;
  let policyControlList: any;
  let institutionsService: any;

  const QUESTIONS_RESPONSE = {
    question_text: 'Is this policy related to a CGIAR initiative?',
    optionsWithAnswers: [
      { result_question_id: 1, question_text: 'Yes', answer_boolean: null },
      { result_question_id: 2, question_text: 'No', answer_boolean: true },
    ],
  };

  const build = () => {
    fixture = TestBed.createComponent(TypePolicyChangeComponent);
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
    policyControlList = {
      policyTypesList: [{ id: 1, name: 'Policy or strategy' }],
      policyStages: [{ id: 2, full_name: 'Design' }],
    };
    institutionsService = { institutionsList: [{ institutions_id: 1, institutions_name: 'Org A' }] };
    bilateralApi = {
      GET_policyChanges: jest.fn().mockReturnValue(of({ response: {} })),
      GET_policyChangesQuestions: jest.fn().mockReturnValue(of({ response: { ...QUESTIONS_RESPONSE } })),
      PATCH_policyChanges: jest.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [TypePolicyChangeComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: expandableState },
        { provide: PolicyControlListService, useValue: policyControlList },
        { provide: InstitutionsService, useValue: institutionsService },
      ],
    })
      .overrideTemplate(TypePolicyChangeComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('loadData', () => {
    it('loads the body and derives the selected related-to answer from the questions response', () => {
      build();
      fixture.detectChanges();
      expect(component.questions.question_text).toBe(QUESTIONS_RESPONSE.question_text);
      expect(component.relatedTo).toBe(2);
    });

    it('leaves relatedTo null when no option is answered yet', () => {
      bilateralApi.GET_policyChangesQuestions.mockReturnValue(
        of({
          response: {
            question_text: 'Q',
            optionsWithAnswers: [{ result_question_id: 1, question_text: 'Yes', answer_boolean: null }],
          },
        }),
      );
      build();
      fixture.detectChanges();
      expect(component.relatedTo).toBeNull();
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
      expect(bilateralApi.GET_policyChanges).not.toHaveBeenCalled();
    });

    it('falls back to empty defaults when the responses are empty', () => {
      bilateralApi.GET_policyChanges.mockReturnValue(of({ response: null }));
      bilateralApi.GET_policyChangesQuestions.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.body).toEqual({});
      expect(component.questions).toEqual({});
      expect(component.relatedTo).toBeNull();
    });
  });

  describe('onRelatedToChange', () => {
    it('marks only the chosen option as answered and clears the rest', () => {
      build();
      fixture.detectChanges();
      component.onRelatedToChange(1);
      expect(component.questions.optionsWithAnswers).toEqual([
        { result_question_id: 1, question_text: 'Yes', answer_boolean: true },
        { result_question_id: 2, question_text: 'No', answer_boolean: null },
      ]);
    });

    it('updates the MDS tracker and queues a save', () => {
      build();
      fixture.detectChanges();
      mdsTracker.setSectionFields.mockClear();
      autoSave.schedulePayload.mockClear();
      component.onRelatedToChange(1);
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
      expect(autoSave.schedulePayload).toHaveBeenCalled();
    });
  });

  describe('updateMds', () => {
    // P2-3383: el tracker decía 'Policy stage' mientras el formulario muestra 'Stage'. El
    // usuario ve dos nombres para el mismo campo y no puede saber cuál pendiente es cuál.
    // El AC llama al campo "Stage in policy process", pero renombrar el campo visible quedó
    // fuera de alcance (ver P2-3377), así que la fuente de verdad es la plantilla.
    it('names the stage item exactly as the form labels it', () => {
      build();
      component.body = {};
      component.questions = {};
      component.updateMds();
      const items = mdsTracker.setSectionFields.mock.calls.at(-1)[1];
      const stage = items.find((i: any) => i.key === 'policy-stage');
      expect(stage.label).toBe('Stage');
      expect(stage.label).not.toBe('Policy stage');
    });

    it('counts nothing while every field is empty', () => {
      build();
      component.body = {};
      component.questions = {};
      component.relatedTo = null;
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'policy-type', label: 'Policy type', filled: false },
        { key: 'policy-stage', label: 'Stage', filled: false },
        { key: 'related-to', label: 'Related to', filled: false },
        {
          key: 'policy-institutions',
          label: 'Whose policy is this? (Implementing organizations)',
          filled: false,
        },
      ]);
    });

    it('uses the dynamic question text as the related-to label once loaded', () => {
      build();
      component.body = {};
      component.questions = { question_text: 'Custom question?' };
      component.relatedTo = 2;
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith(
        'type-specific',
        expect.arrayContaining([
          { key: 'related-to', label: 'Custom question?', filled: true },
        ]),
      );
    });

    it('counts a fully answered form as filled', () => {
      build();
      component.body = { policy_type_id: 1, policy_stage_id: 2, institutions: [{ institutions_id: 1 }] };
      component.questions = { question_text: 'Q' };
      component.relatedTo = 1;
      component.updateMds();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('type-specific', [
        { key: 'policy-type', label: 'Policy type', filled: true },
        { key: 'policy-stage', label: 'Stage', filled: true },
        { key: 'related-to', label: 'Q', filled: true },
        {
          key: 'policy-institutions',
          label: 'Whose policy is this? (Implementing organizations)',
          filled: true,
        },
      ]);
    });
  });

  describe('save flow', () => {
    it('onFieldChange updates the MDS tracker and queues a debounced save merging body and questions', () => {
      build();
      component.body = { policy_type_id: 1 };
      component.questions = { question_text: 'Q' };
      component.onFieldChange();
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { policy_type_id: 1, question_text: 'Q' },
        expect.objectContaining({ debounceMs: 800, statusKey: 'type-specific' }),
      );
    });

    it('onSave queues an immediate save', () => {
      build();
      component.body = { policy_type_id: 1 };
      component.questions = {};
      component.onSave();
      expect(autoSave.schedulePayload).toHaveBeenCalledWith(
        'typeSpecific',
        { policy_type_id: 1 },
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
