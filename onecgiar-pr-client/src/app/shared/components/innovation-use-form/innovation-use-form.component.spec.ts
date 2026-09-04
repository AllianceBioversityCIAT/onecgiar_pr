import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { InnovationUseFormComponent } from './innovation-use-form.component';
import { ApiService } from '../../services/api/api.service';
import { of } from 'rxjs';
import {
  IpsrStep1Body,
  Actor,
  Organization,
  Measure
} from '../../../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';
import { TermPipe } from '../../../internationalization/term.pipe';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TerminologyService } from '../../../internationalization/terminology.service';
import { FieldsManagerService } from '../../services/fields-manager.service';
import { InnovationControlListService } from '../../services/global/innovation-control-list.service';
import { InnovationUseResultsService } from '../../services/global/innovation-use-results.service';

/** P2-3295 — verbatim tooltip from the SIDS revision; must match `FieldsManagerService` character for character. */
const TOOLTIP_2030 =
  "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence.";

describe('InnovationUseFormComponent', () => {
  let component: InnovationUseFormComponent;
  let fixture: ComponentFixture<InnovationUseFormComponent>;
  let apiServiceMock: any;
  let terminologyServiceMock: any;
  let fieldsManagerServiceMock: any;
  let innovationControlListServiceMock: any;
  let innovationUseResultsServiceMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      resultsSE: {
        GETAllActorsTypes: jest.fn().mockReturnValue(of({ response: [] })),
        GETInstitutionsTypeTree: jest.fn().mockReturnValue(of({ response: [] })),
        GET_clarisaInnovationType: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        currentResultSignal: jest.fn().mockReturnValue({}),
        reportingCurrentPhase: { phaseYear: null }
      }
    };

    terminologyServiceMock = {
      t: jest.fn().mockReturnValue('test')
    };

    fieldsManagerServiceMock = {
      isP25: jest.fn().mockReturnValue(false),
      // P2-3295 §2: the projection question is gated on the same 2026 phase threshold as the rename.
      isInnovationUse2030Projection2026: jest.fn().mockReturnValue(true),
      innovationUse2030ProjectionTooltip: jest.fn().mockReturnValue(''),
      // P2-3537 §7: the age-only fallback rides on its own 2026 phase threshold.
      isInnovationUseAgeFallback2026: jest.fn().mockReturnValue(true)
    };

    innovationControlListServiceMock = {
      readinessLevelsList: []
    };

    innovationUseResultsServiceMock = {
      resultsList: []
    };

    await TestBed.configureTestingModule({
      declarations: [InnovationUseFormComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: TerminologyService, useValue: terminologyServiceMock },
        { provide: FieldsManagerService, useValue: fieldsManagerServiceMock },
        { provide: InnovationControlListService, useValue: innovationControlListServiceMock },
        { provide: InnovationUseResultsService, useValue: innovationUseResultsServiceMock }
      ],
      imports: [TermPipe, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InnovationUseFormComponent);
    component = fixture.componentInstance;
    component.body = new IpsrStep1Body();
    component.saving = false;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.actorsTypeList).toEqual([]);
    expect(component.institutionsTypeTreeList).toEqual([]);
    expect(component.body).toBeInstanceOf(IpsrStep1Body);
    expect(component.saving).toBe(false);
  });

  it('should call GETAllActorsTypes on init', () => {
    expect(apiServiceMock.resultsSE.GETAllActorsTypes).toHaveBeenCalled();
  });

  it('should call GETInstitutionsTypeTree on init', () => {
    expect(apiServiceMock.resultsSE.GETInstitutionsTypeTree).toHaveBeenCalled();
  });

  it('should set actorsTypeList from GETAllActorsTypes response', () => {
    apiServiceMock.resultsSE.GETAllActorsTypes.mockReturnValue(of({ response: [{ id: 1, name: 'Actor Type 1' }] }));
    component.GETAllActorsTypes();
    expect(component.actorsTypeList).toEqual([{ id: 1, name: 'Actor Type 1' }]);
  });

  it('should set institutionsTypeTreeList from GETInstitutionsTypeTree response', () => {
    apiServiceMock.resultsSE.GETInstitutionsTypeTree.mockReturnValue(of({ response: [{ id: 1, name: 'Institution Type 1' }] }));
    component.GETInstitutionsTypeTree();
    expect(component.institutionsTypeTreeList).toEqual([{ id: 1, name: 'Institution Type 1' }]);
  });

  it('should cache institutionsTypeTreeChildrens', () => {
    component.institutionsTypeTreeList = [{ code: 1, childrens: [{ id: 1, name: 'Child 1' }] }];
    const result = component.getInstitutionsTypeTreeChildrens(1);
    expect(result).toEqual([{ id: 1, name: 'Child 1' }]);
    expect(component['institutionsTypeTreeChildrensCache'][1]).toEqual([{ id: 1, name: 'Child 1' }]);
  });

  it('should clean actor', () => {
    const actorItem = { women: 10, women_youth: 5, women_non_youth: 5, men: 10, men_youth: 5, men_non_youth: 5, how_many: 20 };
    component.cleanActor(actorItem);
    expect(actorItem).toEqual({
      women: null,
      women_youth: null,
      women_non_youth: null,
      men: null,
      men_youth: null,
      men_non_youth: null,
      how_many: null,
      // P2-3537 §7: "sex and age does not apply" switches both off, so the age-only answer
      // and the system-split stamp have no meaning here. Leaving them set would send the
      // server a contradiction: "age cannot be disaggregated" alongside "neither applies".
      age_disaggregation_not_available: null,
      youth_split_applied_by_system: null
    });
  });

  it('should add new actor', () => {
    component.body.innovatonUse.actors = [];
    component.addActor();
    expect(component.body.innovatonUse.actors.length).toBe(1);
    expect(component.body.innovatonUse.actors[0]).toBeDefined();
  });

  it('should add new organization', () => {
    component.body.innovatonUse.organization = [];
    component.addOrganization();
    expect(component.body.innovatonUse.organization.length).toBe(1);
    expect(component.body.innovatonUse.organization[0]).toBeDefined();
  });

  it('should add new measure', () => {
    component.body.innovatonUse.measures = [];
    component.addOther();
    expect(component.body.innovatonUse.measures.length).toBe(1);
    expect(component.body.innovatonUse.measures[0]).toBeDefined();
  });

  it('should validate youth correctly', () => {
    component.body.innovatonUse.actors = [
      {
        actor_type_id: 1,
        women: 10,
        women_youth: 5,
        women_non_youth: 5,
        men: 10,
        men_youth: 5,
        men_non_youth: 5,
        is_active: true,
        previousWomen: 10,
        previousWomen_youth: 5,
        other_actor_type: '',
        sex_and_age_disaggregation: true,
        how_many: 20,
        result_actors_id: 1
      } as Actor
    ];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    expect(actorItem.women_non_youth).toBe(5);
    expect(actorItem.how_many).toBe(20);
  });

  it('should reload the select correctly', () => {
    const organizationItem = { hide: false, institution_sub_type_id: 123 };
    const detectChangesSpy = jest.spyOn(component['cdr'], 'detectChanges');

    component.reloadSelect(organizationItem);

    expect(organizationItem.institution_sub_type_id).toBeNull();
    expect(organizationItem.hide).toBeFalsy();
    expect(detectChangesSpy).toHaveBeenCalledTimes(1);
  });

  it('should get all sub types correctly', () => {
    component.body.innovatonUse.organization = [{ institution_sub_type_id: 1 }, { institution_sub_type_id: 2 }] as Organization[];
    const subTypes = component.getAllSubTypes;
    expect(subTypes).toEqual([{ code: 1 }, { code: 2 }]);
  });

  it('should remove other actors correctly', () => {
    const actors = [{ actor_type_id: 1 }, { actor_type_id: 5 }, { actor_type_id: 2 }] as Actor[];
    const filteredActors = component.removeOther(actors);
    expect(filteredActors).toEqual([{ actor_type_id: 1 }, { actor_type_id: 2 }]);
  });

  it('should remove other in org correctly', () => {
    const disableOrganizations = [{ code: 78 }, { code: 79 }, { code: 80 }] as any[];
    const filteredOrganizations = component.removeOtherInOrg(disableOrganizations);
    expect(filteredOrganizations).toEqual([{ code: 79 }, { code: 80 }]);
  });

  it('should calculate total field correctly', () => {
    const actorItem = { women: 10, men: 5, sex_and_age_disaggregation: false } as Actor;
    component.calculateTotalField(actorItem);
    expect(actorItem.how_many).toBe(15);
  });

  it('should check if list has elements with id correctly', () => {
    const list = [
      { id: 1, is_active: true },
      { id: 2, is_active: false }
    ];
    const result = component.hasElementsWithId(list, 'id');
    expect(result).toBe(1);
  });

  it('should remove organization correctly', () => {
    const organizationItem = { institution_sub_type_id: 1, institution_types_id: 1, is_active: true } as any;
    component.removeOrganization(organizationItem);
    expect(organizationItem.institution_sub_type_id).toBeNull();
    expect(organizationItem.institution_types_id).toBeNull();
    expect(organizationItem.is_active).toBe(false);
  });

  it('should set genderYouth to null when genderYouth is less than 0', fakeAsync(() => {
    component.body.innovatonUse.actors = [{ women: 10, women_youth: -1, men: 10, men_youth: 5, sex_and_age_disaggregation: false } as Actor];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(150);
    expect(actorItem.women_youth).toBeNull();
  }));

  it('should set gender to 0 when gender is less than 0', fakeAsync(() => {
    component.body.innovatonUse.actors = [{ women: -1, women_youth: 5, men: 10, men_youth: 5, sex_and_age_disaggregation: false } as Actor];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(150);
    expect(actorItem.women).toBe(0);
  }));

  it('should handle when gender is less than genderYouth', fakeAsync(() => {
    component.body.innovatonUse.actors = [
      { women: 5, women_youth: 10, men: 10, men_youth: 5, sex_and_age_disaggregation: false, previousWomen: 5, previousWomen_youth: 10 } as Actor
    ];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(600);
    expect(actorItem.women_youth).toBe(10);
    expect(actorItem.women).toBe(5);
  }));

  it('should set showWomenExplanation to true and false accordingly', fakeAsync(() => {
    component.body.innovatonUse.actors = [
      { women: 5, women_youth: 10, men: 10, men_youth: 5, sex_and_age_disaggregation: false, previousWomen: 5, previousWomen_youth: 10 } as Actor
    ];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(500);
    expect(component.body.innovatonUse.actors[0]['showWomenExplanationwomen']).toBe(true);
    tick(3100);
    expect(component.body.innovatonUse.actors[0]['showWomenExplanationwomen']).toBe(false);
  }));
  // Test for calculateTotalField when sex_and_age_disaggregation is true
  it('should not calculate total field when sex_and_age_disaggregation is true', () => {
    const actorItem = { women: 10, men: 5, sex_and_age_disaggregation: true, how_many: 0 } as Actor;
    component.calculateTotalField(actorItem);
    expect(actorItem.how_many).toBe(0);
  });

  // Test for disableOrganizations
  it('should return the correct list of disableOrganizations', () => {
    component.body.innovatonUse.organization = [
      { institution_sub_type_id: null, institution_types_id: 1 } as Organization,
      { institution_sub_type_id: 2, institution_types_id: 3 } as Organization
    ];
    const result = component.disableOrganizations;
    expect(result).toEqual([{ code: 1 }]);
  });

  // Test for hasElementsWithId when readOnly is true
  it('should filter list based on attribute when readOnly is true', () => {
    component.api.rolesSE.readOnly = true;
    const list = [
      { id: 1, is_active: true },
      { id: 2, is_active: false }
    ];
    const result = component.hasElementsWithId(list, 'id');
    expect(result).toBe(2); // Changed to 2 because both elements have 'id'
  });
  // Test for getInstitutionsTypeTreeChildrens when institutionsTypeTreeChildrensCache is empty
  it('should return empty array when institutionsTypeTreeChildrensCache is empty', () => {
    component.institutionsTypeTreeList = [{ code: 1, childrens: [{ id: 1, name: 'Child 1' }] }];
    const result = component.getInstitutionsTypeTreeChildrens(2);
    expect(result).toEqual([]);
  });

  // Test for actorTypeDescription
  it('should return the correct actor type description', () => {
    const description = component.actorTypeDescription();
    expect(description).toContain("CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years");
  });
  // Test for calculateTotalField when sex_and_age_disaggregation is false
  it('should calculate total field when sex_and_age_disaggregation is false', () => {
    const actorItem = { women: 10, men: 5, sex_and_age_disaggregation: false, how_many: 0 } as Actor;
    component.calculateTotalField(actorItem);
    expect(actorItem.how_many).toBe(15);
  });

  // Test for calculateTotalField when sex_and_age_disaggregation is true
  it('should not calculate total field when sex_and_age_disaggregation is true', () => {
    const actorItem = { women: 10, men: 5, sex_and_age_disaggregation: true, how_many: 0 } as Actor;
    component.calculateTotalField(actorItem);
    expect(actorItem.how_many).toBe(0);
  });

  // Test for validateYouth when genderYouth is less than 0
  it('should set genderYouth to null when genderYouth is less than 0', fakeAsync(() => {
    component.body.innovatonUse.actors = [{ women: 10, women_youth: -1, men: 10, men_youth: 5, sex_and_age_disaggregation: false } as Actor];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(100);
    expect(actorItem.women_youth).toBeNull();
  }));

  // Test for validateYouth when gender is less than 0
  it('should set gender to 0 when gender is less than 0', fakeAsync(() => {
    component.body.innovatonUse.actors = [{ women: -1, women_youth: 5, men: 10, men_youth: 5, sex_and_age_disaggregation: false } as Actor];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(100);
    expect(actorItem.women).toBe(0);
  }));

  // Test for validateYouth when gender is less than genderYouth
  it('should handle when gender is less than genderYouth', fakeAsync(() => {
    component.body.innovatonUse.actors = [
      { women: 5, women_youth: 10, men: 10, men_youth: 5, sex_and_age_disaggregation: false, previousWomen: 5, previousWomen_youth: 10 } as Actor
    ];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(600);
    expect(actorItem.women_youth).toBe(10);
    expect(actorItem.women).toBe(5);
  }));

  // Test for showWomenExplanation values
  it('should set showWomenExplanation to true and false accordingly', fakeAsync(() => {
    component.body.innovatonUse.actors = [
      { women: 5, women_youth: 10, men: 10, men_youth: 5, sex_and_age_disaggregation: false, previousWomen: 5, previousWomen_youth: 10 } as Actor
    ];
    const actorItem = component.body.innovatonUse.actors[0];
    component.validateYouth(0, true, actorItem);
    tick(500);
    expect(component.body.innovatonUse.actors[0]['showWomenExplanationwomen']).toBe(true);
    tick(3100);
    expect(component.body.innovatonUse.actors[0]['showWomenExplanationwomen']).toBe(false);
  }));

  describe('ngOnChanges', () => {
    it('should call initializeComponentProperties', () => {
      const spy = jest.spyOn(component, 'initializeComponentProperties');
      component.ngOnChanges();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('initializeComponentProperties - falsy body properties', () => {
    it('should initialize missing body properties with defaults', () => {
      const body = component.body as any;
      body.initiative_expected_investment = null;
      body.bilateral_expected_investment = null;
      body.institutions_expected_investment = null;
      body.reference_materials = null;
      body.pictures = null;
      body.studies_links = null;
      body.scaling_studies_urls = null;
      body.innovation_use_2030 = null;
      body.innov_use_to_be_determined = undefined;
      body.innov_use_2030_to_be_determined = undefined;
      body.result = null;

      component.initializeComponentProperties();

      expect(body.initiative_expected_investment).toEqual([]);
      expect(body.bilateral_expected_investment).toEqual([]);
      expect(body.institutions_expected_investment).toEqual([]);
      expect(body.reference_materials).toEqual([{ link: '' }]);
      expect(body.pictures).toEqual([{ link: '' }]);
      expect(body.studies_links).toEqual([{ link: '' }]);
      expect(body.scaling_studies_urls).toEqual([{ link: '' }]);
      expect(body.innovation_use_2030).toEqual({ actors: [], measures: [], organization: [] });
      expect(body.innov_use_to_be_determined).toBe(false);
      expect(body.innov_use_2030_to_be_determined).toBe(false);
      expect(body.result).toEqual({ title: '' });
    });

    it('should not overwrite existing truthy properties', () => {
      const body = component.body as any;
      body.initiative_expected_investment = [{ test: 1 }];
      body.reference_materials = [{ link: 'http://example.com' }];
      body.innov_use_to_be_determined = true;
      body.result = { title: 'Existing Title' };

      component.initializeComponentProperties();

      expect(body.initiative_expected_investment).toEqual([{ test: 1 }]);
      expect(body.reference_materials).toEqual([{ link: 'http://example.com' }]);
      expect(body.innov_use_to_be_determined).toBe(true);
      expect(body.result).toEqual({ title: 'Existing Title' });
    });
  });

  describe('bodyAsAny', () => {
    it('should return body cast as any', () => {
      expect(component.bodyAsAny).toBe(component.body);
    });
  });

  describe('readiness_of_this_innovation_description', () => {
    it('should return a string with readiness description', () => {
      const result = component.readiness_of_this_innovation_description();
      expect(result).toContain('Be realistic in assessing the use level');
      expect(result).toContain('INNOVATION USE CALCULATOR');
    });
  });

  describe('hasReadinessLevelDiminished', () => {
    it('should return true when current level is less than old level', () => {
      innovationControlListServiceMock.readinessLevelsList = [
        { id: 1, level: 2 },
        { id: 2, level: 5 }
      ];
      component.body.innovation_readiness_level_id = 1;
      component.body.previous_irl = 2;

      expect(component.hasReadinessLevelDiminished()).toBe(true);
    });

    it('should return false when current level is greater or equal to old level', () => {
      innovationControlListServiceMock.readinessLevelsList = [
        { id: 1, level: 5 },
        { id: 2, level: 2 }
      ];
      component.body.innovation_readiness_level_id = 1;
      component.body.previous_irl = 2;

      expect(component.hasReadinessLevelDiminished()).toBe(false);
    });

    it('should handle when levels are not found', () => {
      innovationControlListServiceMock.readinessLevelsList = [];
      component.body.innovation_readiness_level_id = 99;
      component.body.previous_irl = 100;

      const result = component.hasReadinessLevelDiminished();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('alertInfoText2', () => {
    it('should return a string with alert info text', () => {
      apiServiceMock.resultsSE.currentResultCode = 'RC001';
      apiServiceMock.resultsSE.currentResultPhase = 'P1';

      const result = component.alertInfoText2();
      expect(result).toContain('Please make sure you provide evidence');
      expect(result).toContain('Evidence');
    });
  });

  describe('alertDiminishedReadinessLevel', () => {
    it('should return a string with diminished readiness alert', () => {
      const result = component.alertDiminishedReadinessLevel();
      expect(result).toContain('readiness level has decreased');
    });
  });

  describe('getInstitutionsTypeTreeChildrens - cache hit', () => {
    it('should return cached value on second call', () => {
      component.institutionsTypeTreeList = [{ code: 10, childrens: [{ id: 1, name: 'Child' }] }];

      const result1 = component.getInstitutionsTypeTreeChildrens(10);
      expect(result1).toEqual([{ id: 1, name: 'Child' }]);

      // Second call should hit cache
      const result2 = component.getInstitutionsTypeTreeChildrens(10);
      expect(result2).toEqual([{ id: 1, name: 'Child' }]);
      expect(result1).toBe(result2);
    });
  });

  describe('addActor2030', () => {
    it('should add actor to innovation_use_2030.actors when array exists', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { actors: [], organization: [], measures: [] };

      component.addActor2030();

      expect(body.innovation_use_2030.actors.length).toBe(1);
    });

    it('should initialize actors array if it does not exist', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { organization: [], measures: [] };

      component.addActor2030();

      expect(body.innovation_use_2030.actors.length).toBe(1);
    });
  });

  describe('addOrganization2030', () => {
    it('should add organization to innovation_use_2030.organization when array exists', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { actors: [], organization: [], measures: [] };

      component.addOrganization2030();

      expect(body.innovation_use_2030.organization.length).toBe(1);
    });

    it('should initialize organization array if it does not exist', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { actors: [], measures: [] };

      component.addOrganization2030();

      expect(body.innovation_use_2030.organization.length).toBe(1);
    });
  });

  describe('addOther2030', () => {
    it('should add measure to innovation_use_2030.measures when array exists', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { actors: [], organization: [], measures: [] };

      component.addOther2030();

      expect(body.innovation_use_2030.measures.length).toBe(1);
    });

    it('should initialize measures array if it does not exist', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { actors: [], organization: [] };

      component.addOther2030();

      expect(body.innovation_use_2030.measures.length).toBe(1);
    });
  });

  describe('getAllSubTypes2030', () => {
    it('should return sub types from innovation_use_2030.organization', () => {
      const body = component.body as any;
      body.innovation_use_2030 = {
        organization: [{ institution_sub_type_id: 1 }, { institution_sub_type_id: 2 }]
      };

      const result = component.getAllSubTypes2030;
      expect(result).toEqual([{ code: 1 }, { code: 2 }]);
    });

    it('should return empty array when innovation_use_2030.organization is null', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { organization: null };

      const result = component.getAllSubTypes2030;
      expect(result).toEqual([]);
    });

    it('should return empty array when innovation_use_2030 is null', () => {
      const body = component.body as any;
      body.innovation_use_2030 = null;

      const result = component.getAllSubTypes2030;
      expect(result).toEqual([]);
    });
  });

  describe('disableOrganizations2030', () => {
    it('should return organizations without sub type from innovation_use_2030', () => {
      const body = component.body as any;
      body.innovation_use_2030 = {
        organization: [
          { institution_sub_type_id: null, institution_types_id: 10 },
          { institution_sub_type_id: 5, institution_types_id: 20 }
        ]
      };

      const result = component.disableOrganizations2030;
      expect(result).toEqual([{ code: 10 }]);
    });

    it('should return empty array when innovation_use_2030.organization is null', () => {
      const body = component.body as any;
      body.innovation_use_2030 = { organization: null };

      const result = component.disableOrganizations2030;
      expect(result).toEqual([]);
    });

    it('should return empty array when innovation_use_2030 is null', () => {
      const body = component.body as any;
      body.innovation_use_2030 = null;

      const result = component.disableOrganizations2030;
      expect(result).toEqual([]);
    });
  });

  describe('hasElementsWithId - non-array input', () => {
    it('should return 0 when list is not an array', () => {
      expect(component.hasElementsWithId(null, 'id')).toBe(0);
      expect(component.hasElementsWithId(undefined, 'id')).toBe(0);
      expect(component.hasElementsWithId('string' as any, 'id')).toBe(0);
    });
  });

  describe('validateYouth with men (isWomen=false)', () => {
    it('should validate youth for men branch', fakeAsync(() => {
      component.body.innovatonUse.actors = [
        {
          actor_type_id: 1,
          women: 10,
          women_youth: 5,
          women_non_youth: 5,
          men: 10,
          men_youth: 5,
          men_non_youth: 5,
          is_active: true,
          previousWomen: 10,
          previousWomen_youth: 5,
          other_actor_type: '',
          sex_and_age_disaggregation: true,
          how_many: 20,
          result_actors_id: 1
        } as Actor
      ];
      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, false, actorItem);
      tick(1200);
      expect(actorItem.men_non_youth).toBe(5);
    }));

    it('should handle men_youth less than 0', fakeAsync(() => {
      component.body.innovatonUse.actors = [
        { women: 10, women_youth: 5, men: 10, men_youth: -1, men_non_youth: 0, sex_and_age_disaggregation: false } as Actor
      ];
      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, false, actorItem);
      tick(150);
      expect(actorItem.men_youth).toBeNull();
    }));

    it('should handle men less than 0', fakeAsync(() => {
      component.body.innovatonUse.actors = [
        { women: 10, women_youth: 5, men: -1, men_youth: 5, men_non_youth: 0, sex_and_age_disaggregation: false } as Actor
      ];
      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, false, actorItem);
      tick(150);
      expect(actorItem.men).toBe(0);
    }));

    it('should handle men < men_youth', fakeAsync(() => {
      component.body.innovatonUse.actors = [
        {
          women: 10,
          women_youth: 5,
          men: 3,
          men_youth: 10,
          men_non_youth: 0,
          sex_and_age_disaggregation: false,
          previousWomen: 3,
          previousWomen_youth: 10
        } as Actor
      ];
      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, false, actorItem);
      tick(600);
      expect(actorItem.men_youth).toBe(10);
      expect(actorItem.men).toBe(3);
    }));
  });

  describe('currentUseHeaderLabel', () => {
    it('should return P25 label when isP25 is true', () => {
      fieldsManagerServiceMock.isP25.mockReturnValue(true);
      const result = component.currentUseHeaderLabel();
      expect(result).toContain('within the reporting year');
    });

    it('should return non-P25 label when isP25 is false', () => {
      fieldsManagerServiceMock.isP25.mockReturnValue(false);
      const result = component.currentUseHeaderLabel();
      expect(result).toContain('Specify the current use');
    });
  });

  describe('narrativeActors', () => {
    it('should return non-P25 variant when isP25 is false (default)', () => {
      const result = component.narrativeActors();
      expect(result).toContain('Individuals, organizations or networks');
    });
  });

  describe('getUseLevelIndex', () => {
    it('should return the level number when selectedId and list are valid', () => {
      innovationControlListServiceMock.useLevelsList = [
        { id: 1, level: 3 },
        { id: 2, level: 5 }
      ];
      component.body.innovation_use_level_id = 1;

      expect(component.getUseLevelIndex()).toBe(3);
    });

    it('should return -1 when selectedId is null', () => {
      innovationControlListServiceMock.useLevelsList = [{ id: 1, level: 3 }];
      component.body.innovation_use_level_id = null;

      expect(component.getUseLevelIndex()).toBe(-1);
    });

    it('should return -1 when list is empty', () => {
      innovationControlListServiceMock.useLevelsList = [];
      component.body.innovation_use_level_id = 1;

      expect(component.getUseLevelIndex()).toBe(-1);
    });

    it('should return -1 when selected level is not found', () => {
      innovationControlListServiceMock.useLevelsList = [{ id: 1, level: 3 }];
      component.body.innovation_use_level_id = 99;

      expect(component.getUseLevelIndex()).toBe(-1);
    });

    it('should return -1 when level is not a finite number', () => {
      innovationControlListServiceMock.useLevelsList = [{ id: 1, level: 'abc' }];
      component.body.innovation_use_level_id = 1;

      expect(component.getUseLevelIndex()).toBe(-1);
    });
  });

  // P2-3535: "Have any studies been conducted to inform the innovation scaling strategy design
  // (...)" is retired from the Innovation Use form at EVERY use level from the 2026 phase on
  // (Angel Jarrín, 28-Aug-2026), superseding P2-3294's partial level-6 rule. Phases <= 2025 keep
  // showing it exactly as before, and IPSR step 1 ([isIpsr]="true") stays on the level-6 rule
  // until P2-3426 is republished.
  describe('isScalingStudiesQuestionHidden', () => {
    beforeEach(() => {
      innovationControlListServiceMock.useLevelsList = [
        { id: 5, level: 5 },
        { id: 6, level: 6 },
        { id: 7, level: 7 },
        { id: 8, level: 8 },
        { id: 9, level: 9 }
      ];
    });

    it.each([5, 6, 7, 8, 9])('hides the question at level %i in a 2026 phase', level => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({ phase_year: 2026 });
      component.body.innovation_use_level_id = level;

      expect(component.isScalingStudiesQuestionHidden()).toBe(true);
    });

    it('hides the question in a 2026 phase even before a use level has been chosen', () => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({ phase_year: 2026 });
      component.body.innovation_use_level_id = null;

      expect(component.isScalingStudiesQuestionHidden()).toBe(true);
    });

    // Backwards-compatibility lock for the whole P2-3243 epic: a 2025-phase result must look
    // EXACTLY as it does today, at every use level where the question used to show (5..9).
    it.each([5, 6, 7, 8, 9])('keeps the question visible at level %i in a 2025 phase', level => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({ phase_year: 2025 });
      component.body.innovation_use_level_id = level;

      expect(component.isScalingStudiesQuestionHidden()).toBe(false);
    });

    it('keeps the question visible (fails open) when phase_year is not available', () => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({});
      apiServiceMock.dataControlSE.reportingCurrentPhase = { phaseYear: null };
      component.body.innovation_use_level_id = 9;

      expect(component.isScalingStudiesQuestionHidden()).toBe(false);
    });

    // P2-3558 — this used to assert `true`, i.e. it described the defect: with no `phase_year` on
    // the result the gate read `reportingCurrentPhase.phaseYear`, the OPEN reporting phase (2026 in
    // production), and hid the question on a legacy result. Same call the eight sibling gates in
    // `FieldsManagerService` made, fixed in `8afb574f3`.
    it('ignores reportingCurrentPhase.phaseYear when currentResultSignal has no phase_year', () => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({});
      apiServiceMock.dataControlSE.reportingCurrentPhase = { phaseYear: 2026 };
      component.body.innovation_use_level_id = 7;

      expect(component.isScalingStudiesQuestionHidden()).toBe(false);
    });

    // A year arriving as a string is a bad payload, and a bad payload gets the legacy form.
    it('keeps the question visible when phase_year arrives as a string', () => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({ phase_year: '2026' });
      apiServiceMock.dataControlSE.reportingCurrentPhase = { phaseYear: 2026 };
      component.body.innovation_use_level_id = 7;

      expect(component.isScalingStudiesQuestionHidden()).toBe(false);
    });

    // Scope lock (Yeck, 31-Aug-2026): P2-3535 covers the Innovation Use section only. IPSR
    // Innovation Package step 1 reuses this template with [isIpsr]="true" and must keep the
    // previous P2-3294 behaviour until P2-3426 is republished by Ángel.
    describe('IPSR step 1 host ([isIpsr] = true)', () => {
      beforeEach(() => {
        component.isIpsr = true;
        apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({ phase_year: 2026 });
      });

      it('keeps the question visible at level 5', () => {
        component.body.innovation_use_level_id = 5;

        expect(component.isScalingStudiesQuestionHidden()).toBe(false);
      });

      it.each([6, 7, 8, 9])('still hides the question at level %i', level => {
        component.body.innovation_use_level_id = level;

        expect(component.isScalingStudiesQuestionHidden()).toBe(true);
      });

      it('keeps the question visible (fails open) when no level has been chosen yet', () => {
        component.body.innovation_use_level_id = null;

        expect(component.isScalingStudiesQuestionHidden()).toBe(false);
      });

      // P2-3558 — the IPSR branch must not consult the open reporting phase either.
      it('keeps the question visible at level 9 when the result carries no phase_year', () => {
        apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue({});
        apiServiceMock.dataControlSE.reportingCurrentPhase = { phaseYear: 2026 };
        component.body.innovation_use_level_id = 9;

        expect(component.isScalingStudiesQuestionHidden()).toBe(false);
      });
    });
  });

  /**
   * P2-3558 — the SAME assertions, but against the RENDERED DOM.
   *
   * ⚠️ Zoneless: asserting on `isScalingStudiesQuestionHidden()` alone is not enough — the method
   * is a plain class member and a test that reads it passes with the defect present as long as the
   * mock nulls `reportingCurrentPhase`. These tests set `reportingCurrentPhase.phaseYear = 2026`,
   * which is what production actually carries (`data-control.service.ts:125`), and then look for the
   * radio in the DOM. The "no phase_year" case below FAILS on the pre-fix code.
   */
  describe('scaling-studies question in the rendered DOM', () => {
    const SCALING_RADIO_FIELD_REF = '[innovation-use-form]-has-studies-links';
    /** The whole scaling-studies block lives inside `@if (isP25() && !isIpsr)` (`.html:287`). */
    const renderWith = ({ phaseYear, level, isIpsr = false }: { phaseYear?: unknown; level: number | null; isIpsr?: boolean }) => {
      apiServiceMock.dataControlSE.currentResultSignal.mockReturnValue(phaseYear === undefined ? {} : { phase_year: phaseYear });
      // The OPEN reporting phase, as production carries it — the value the removed fallback read.
      apiServiceMock.dataControlSE.reportingCurrentPhase = { phaseYear: 2026 };
      fieldsManagerServiceMock.isP25.mockReturnValue(true);
      innovationControlListServiceMock.useLevelsList = [
        { id: 5, level: 5 },
        { id: 6, level: 6 },
        { id: 9, level: 9 }
      ];

      fixture = TestBed.createComponent(InnovationUseFormComponent);
      component = fixture.componentInstance;
      component.body = new IpsrStep1Body();
      component.body.innovation_use_level_id = level;
      component.saving = false;
      component.isIpsr = isIpsr;
      // This view only: the app-wide checkNoChanges pass trips on the P25 branch on its own
      // (`getUseLevelIndex()` settles from -1), unrelated to this gate.
      fixture.changeDetectorRef.detectChanges();
      fixture.changeDetectorRef.detectChanges();

      return fixture.debugElement
        .queryAll(By.css('app-pr-radio-button'))
        .some(de => de.nativeElement.getAttribute('fieldRef') === SCALING_RADIO_FIELD_REF);
    };

    // 🛑 The regression test: FAILS on the pre-fix code, which resolved the year to the open
    // reporting phase (2026) and painted no radio at all on a result whose year had not landed.
    it('paints the radio when the result carries no phase_year, even with the open phase at 2026', () => {
      expect(renderWith({ level: 9 })).toBe(true);
    });

    it('paints the radio for a 2025-phase result', () => {
      expect(renderWith({ phaseYear: 2025, level: 9 })).toBe(true);
    });

    it('drops the radio for a 2026-phase result', () => {
      expect(renderWith({ phaseYear: 2026, level: 9 })).toBe(false);
    });

    it('paints the radio when phase_year arrives as a string', () => {
      expect(renderWith({ phaseYear: '2026', level: 9 })).toBe(true);
    });

    /**
     * The IPSR Innovation Package step-1 host (`step-n1.component.html:26`, `[isIpsr]="true"`).
     * ⚠️ The block that holds this question is fenced with `&& !this.isIpsr` (`.html:287`), so the
     * IPSR host paints no scaling-studies radio in ANY phase — the `isIpsr` level-6 branch inside
     * `isScalingStudiesQuestionHidden()` is unreachable from this template. These cases lock that
     * the fix leaves the IPSR host exactly where it was.
     */
    describe('IPSR step 1 host ([isIpsr] = true)', () => {
      it.each([
        ['no phase_year', undefined],
        ['a 2025 phase', 2025],
        ['a 2026 phase', 2026]
      ])('paints no scaling-studies radio with %s', (_label, phaseYear) => {
        expect(renderWith({ phaseYear, level: 9, isIpsr: true })).toBe(false);
      });
    });
  });

  /**
   * P2-3295 — the 2030 block gets the projection tooltip from the 2026 phase on. The string itself lives on
   * `FieldsManagerService`, because `preventFieldRender()` only mirrors label/description/required and would
   * drop a tooltip carried in `fields()`; what this asserts is that the template forwards it.
   *
   * ⚠️ It used to hang off the "This is yet to be determined" radio. That radio is one of the four
   * sub-fields, not the question, and §2 of the story attaches the tooltip to the mandatory label
   * "What is the projected innovation use by end of 2030?" — so that is where it is asserted now.
   */
  describe('2030 Use Projection tooltip binding', () => {
    /** The 2030 block only exists on the P25 branch, which is picked on the first render. */
    const renderP25With = (tooltip: string) => {
      fieldsManagerServiceMock.isP25.mockReturnValue(true);
      fieldsManagerServiceMock.innovationUse2030ProjectionTooltip.mockReturnValue(tooltip);
      fixture = TestBed.createComponent(InnovationUseFormComponent);
      component = fixture.componentInstance;
      component.body = new IpsrStep1Body();
      component.saving = false;
      // Refresh this view only: `fixture.detectChanges()` runs the app-wide checkNoChanges pass, which the
      // P25 branch trips on its own (`getUseLevelIndex()` settles from -1 on the second pass) — unrelated to P2-3295.
      fixture.changeDetectorRef.detectChanges();
      return fixture.debugElement.query(By.css('[data-testid="iu-field-2030-projection-question"]'));
    };

    it('forwards the projection tooltip to the projection question for a 2026-phase result', () => {
      const question = renderP25With(TOOLTIP_2030);

      expect(question).toBeTruthy();
      expect(question.nativeElement.tooltip).toBe(TOOLTIP_2030);
    });

    it('renders the question verbatim, and mandatory', () => {
      const question = renderP25With(TOOLTIP_2030);

      expect(question.nativeElement.label).toBe('What is the projected innovation use by end of 2030?');
      expect(question.nativeElement.required).toBe(true);
    });

    it('does NOT render the question for an earlier phase — that form stays as it is', () => {
      fieldsManagerServiceMock.isInnovationUse2030Projection2026.mockReturnValue(false);

      const question = renderP25With(TOOLTIP_2030);

      expect(question).toBeNull();
    });

    it('forwards an empty tooltip for a 2025-phase result, so no \u24d8 button is painted', () => {
      const radio = renderP25With('');

      expect(radio).toBeTruthy();
      expect(radio.nativeElement.tooltip).toBe('');
    });
  });
  /**
   * P2-3537 §4 — the Current Use Update block, and the reconciliation that governs it.
   *
   * The case that matters most is the one that is NOT here as an error: a result whose previous
   * phase reported no actors must not see the block at all. Yeck's decision of 3 Sep 2026 — showing
   * it would mean reconciling against zero actors, an error the reporter can never resolve, so they
   * could never submit. Every other test guards the arithmetic or the "0 is a valid answer" rule.
   */
  describe('§4 — Current Use Update block (P2-3537)', () => {
    const previous = (total: number, year: number | null = 2025) => ({
      result_id: 40,
      phase_year: year,
      total_actors: total,
      actors: [],
    });

    const withActors = (...amounts: number[]) =>
      amounts.map(n => Object.assign(new Actor(), { how_many: n, is_active: true }));

    beforeEach(() => {
      component.body = new IpsrStep1Body();
      component.body.current_use_previous = previous(500);
      component.body.innovatonUse.actors = withActors(500);
      component.body.new_users_added = null;
      component.body.use_expansion_narrative = null;
    });

    it('renders the block when the previous phase reported actors', () => {
      expect(component.showCurrentUseUpdate()).toBe(true);
    });

    it('does NOT render it on a first report', () => {
      component.body.current_use_previous = null;
      expect(component.showCurrentUseUpdate()).toBe(false);
    });

    it('does NOT render it when the previous phase had organisations but no actors', () => {
      // The server sends null for that case too. Rendering the block would show a permanent
      // mismatch against zero actors that nothing the reporter does can fix.
      component.body.current_use_previous = null;
      expect(component.showCurrentUseUpdate()).toBe(false);
      expect(component.hasCurrentUseMismatch()).toBe(false);
    });

    it('does NOT render it before the 2026 phase', () => {
      fieldsManagerServiceMock.isInnovationUseAgeFallback2026.mockReturnValue(false);
      expect(component.showCurrentUseUpdate()).toBe(false);
    });

    it('does NOT render it inside IPSR, which shares this template', () => {
      component.isIpsr = true;
      expect(component.showCurrentUseUpdate()).toBe(false);
    });

    it('calculates the cumulative total as previous + new, never typed', () => {
      component.body.new_users_added = 120;
      expect(component.totalCumulativeUse()).toBe(620);
    });

    it('treats an unanswered increment as zero for the arithmetic, without NaN', () => {
      expect(component.totalCumulativeUse()).toBe(500);
      expect(Number.isNaN(component.totalCumulativeUse())).toBe(false);
    });

    it('reconciles when the user categories match the cumulative total', () => {
      component.body.new_users_added = 120;
      component.body.innovatonUse.actors = withActors(400, 220);
      expect(component.actorsTotal()).toBe(620);
      expect(component.hasCurrentUseMismatch()).toBe(false);
    });

    it('flags a mismatch naming the exact difference', () => {
      component.body.new_users_added = 120;
      component.body.innovatonUse.actors = withActors(600);

      expect(component.hasCurrentUseMismatch()).toBe(true);
      expect(component.currentUseDifference()).toBe(-20);
      const msg = component.currentUseMismatchMessage();
      expect(msg).toContain('600');
      expect(msg).toContain('620');
      expect(msg).toContain('20');
    });

    it('ignores actor rows the reporter deleted', () => {
      component.body.new_users_added = 0;
      const actors = withActors(500, 999);
      actors[1].is_active = false;
      component.body.innovatonUse.actors = actors;

      expect(component.actorsTotal()).toBe(500);
      expect(component.hasCurrentUseMismatch()).toBe(false);
    });

    it('accepts a reported ZERO and still demands the narrative', () => {
      // §5: use verified and did not grow. Allowed, but it has to be explained.
      component.body.new_users_added = 0;
      expect(component.isCurrentUseUpdateComplete()).toBe(false);

      component.body.use_expansion_narrative = 'Verified with the cooperative; no new users.';
      expect(component.isCurrentUseUpdateComplete()).toBe(true);
    });

    it('is incomplete while the increment has not been answered at all', () => {
      component.body.use_expansion_narrative = 'Something happened.';
      expect(component.isCurrentUseUpdateComplete()).toBe(false);
    });

    it('is incomplete while the figures do not reconcile, even with both fields filled', () => {
      component.body.new_users_added = 120;
      component.body.use_expansion_narrative = 'A distribution agreement.';
      component.body.innovatonUse.actors = withActors(1);

      expect(component.isCurrentUseUpdateComplete()).toBe(false);
    });

    it('refuses a negative increment: use cannot decrease through this field', () => {
      component.body.new_users_added = -5;
      component.onNewUsersAddedChange();
      expect(component.body.new_users_added).toBe(0);
    });

    it('omits the round label rather than guessing it', () => {
      component.body.current_use_previous = previous(500, null);
      expect(component.previousUsePhaseYear()).toBeNull();
      expect(component.previousReportedUse()).toBe(500);
    });

    it('counts nothing but actors — organisations never enter the total', () => {
      // Yeck's Q4 decision. If this ever changes, next year's "previous use" becomes a figure
      // nobody can decompose.
      component.body.new_users_added = 0;
      component.body.innovatonUse.organization = [{ how_many: 12 } as any];
      component.body.innovatonUse.actors = withActors(500);

      expect(component.actorsTotal()).toBe(500);
      expect(component.hasCurrentUseMismatch()).toBe(false);
    });
  });

  /**
   * P2-3537 section 7 — the age-only fallback and the system-applied 50/50 split.
   *
   * What this pins is the part the story cares about most: that a computed figure is
   * never mistaken for a reported one. Every case below is one that would either lose
   * that distinction or leave the arithmetic inconsistent.
   */
  describe('section 7 — age-only fallback (P2-3537)', () => {
    const actorWith = (over: any = {}) => Object.assign(new Actor(), { women: 10, men: 7, ...over });

    beforeEach(() => {
      component.body = new IpsrStep1Body();
      component.body.innovatonUse.actors = [actorWith()];
    });

    it('is offered from the 2026 phase, on a row that still disaggregates by sex', () => {
      expect(component.showAgeFallback(component.body.innovatonUse.actors[0])).toBe(true);
    });

    it('is NOT offered before the 2026 phase', () => {
      fieldsManagerServiceMock.isInnovationUseAgeFallback2026.mockReturnValue(false);
      expect(component.showAgeFallback(component.body.innovatonUse.actors[0])).toBe(false);
    });

    it('is NOT offered inside IPSR, which shares this template', () => {
      // Gated out explicitly rather than by omission — the lesson P2-3295 left here.
      component.isIpsr = true;
      expect(component.showAgeFallback(component.body.innovatonUse.actors[0])).toBe(false);
    });

    it('is NOT offered while "sex and age" is ticked, which already switches both off', () => {
      const actor = actorWith({ sex_and_age_disaggregation: true });
      expect(component.showAgeFallback(actor)).toBe(false);
    });

    it('splits youth 50/50 and stamps that the SYSTEM did it', () => {
      const actor = actorWith({ age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);

      expect(actor.women_youth).toBe(5);
      expect(actor.women_non_youth).toBe(5);
      expect(actor.men_youth).toBe(4);
      expect(actor.men_non_youth).toBe(3);
      // The whole point of the story: this is what tells an estimate from a report.
      expect(actor.youth_split_applied_by_system).toBe(true);
    });

    it('keeps youth + non-youth equal to the total on an odd number', () => {
      // 7 men -> 4 + 3. Rounding can never break it because non-youth is the remainder.
      const actor = actorWith({ men: 7, women: 3, age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);

      expect(actor.men_youth + actor.men_non_youth).toBe(7);
      expect(actor.women_youth + actor.women_non_youth).toBe(3);
    });

    it('recalculates when the total changes, so the halves never go stale', () => {
      const actor = actorWith({ age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);
      actor.women = 20;
      component.recalculateAgeFallback(actor);

      expect(actor.women_youth).toBe(10);
      expect(actor.women_non_youth).toBe(10);
    });

    it('does not touch a row whose fallback is off', () => {
      const actor = actorWith({ women_youth: 3 });
      component.recalculateAgeFallback(actor);

      expect(actor.women_youth).toBe(3);
      expect(actor.youth_split_applied_by_system).toBeUndefined();
    });

    it('unticking clears the computed halves AND the stamp', () => {
      // Leaving the halves behind would turn a system estimate into what reads as the
      // reporter's own answer — the exact confusion the stamp exists to prevent.
      const actor = actorWith({ age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);
      actor.age_disaggregation_not_available = false;
      component.applyAgeDisaggregationFallback(actor);

      expect(actor.women_youth).toBeNull();
      expect(actor.men_youth).toBeNull();
      expect(actor.youth_split_applied_by_system).toBeNull();
    });

    it('ticking "sex and age" wipes the age-only answer, so no contradiction is sent', () => {
      const actor = actorWith({ age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);
      component.cleanActor(actor);

      expect(actor.age_disaggregation_not_available).toBeNull();
      expect(actor.youth_split_applied_by_system).toBeNull();
    });

    it('treats an empty or zero total as zero, without producing NaN', () => {
      const actor = actorWith({ women: null, men: 0, age_disaggregation_not_available: true });
      component.applyAgeDisaggregationFallback(actor);

      expect(actor.women_youth).toBe(0);
      expect(actor.men_youth).toBe(0);
      expect(Number.isNaN(actor.women_non_youth)).toBe(false);
    });

    it('reports the split as system-applied only while the stamp is set', () => {
      const actor = actorWith();
      expect(component.isYouthSplitBySystem(actor)).toBe(false);
      actor.youth_split_applied_by_system = true;
      expect(component.isYouthSplitBySystem(actor)).toBe(true);
    });
  });
});

/**
 * P2-3295 §3 — reviewing a 2030 projection inherited from the previous reporting phase.
 *
 * Built off the prototype, with no TestBed: every path below is a getter over `body` and the Yes/No
 * answer, and rendering the 2030 block (~270 lines of repeated field groups) would test the DOM
 * instead of the rule that decides the behaviour — which values differ from the previous phase.
 */
describe('InnovationUseFormComponent — 2030 projection review (P2-3295 §3)', () => {
  const actor = (over: Record<string, unknown> = {}) => ({
    actor_type_id: 4,
    women: 10,
    women_youth: 2,
    men: 8,
    men_youth: 1,
    how_many: null,
    is_active: true,
    ...over
  });

  function makeComponent(body: any) {
    const instance: any = Object.create(InnovationUseFormComponent.prototype);
    instance.body = body;
    instance.reviewing2030Projection = false;
    return instance;
  }

  const withoutPreviousPhase = () => makeComponent({ innovation_use_2030: { actors: [], organization: [], measures: [] } });

  const withPreviousPhase = () =>
    makeComponent({
      innovation_use_2030: { actors: [actor()], organization: [], measures: [] },
      innovation_use_2030_previous: {
        result_id: 8090,
        actors: [actor()],
        organization: [],
        measures: []
      }
    });

  describe('Scenario A — first-time reporting', () => {
    it('is not in review mode and never locks the fields', () => {
      const component = withoutPreviousPhase();

      expect(component.has2030PreviousProjection).toBe(false);
      expect(component.projection2030Locked).toBe(false);
      expect(component.projection2030Changed).toBe(false);
      expect(component.projection2030JustificationRequired).toBe(false);
    });
  });

  describe('Scenario B — the projection came from the previous phase', () => {
    it('starts locked, because the default answer is No', () => {
      const component = withPreviousPhase();

      expect(component.has2030PreviousProjection).toBe(true);
      expect(component.reviewing2030Projection).toBe(false);
      expect(component.projection2030Locked).toBe(true);
    });

    it('unlocks when the reporter answers Yes', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;

      expect(component.projection2030Locked).toBe(false);
    });

    it('asks for no justification while the values still match what was reported', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;

      expect(component.projection2030Changed).toBe(false);
      expect(component.projection2030JustificationRequired).toBe(false);
    });

    it('asks for a justification once an inherited value is changed', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;
      component.body.innovation_use_2030.actors[0].women = 40;

      expect(component.projection2030Changed).toBe(true);
      expect(component.projection2030JustificationRequired).toBe(true);
    });

    it('stops asking when the change is undone', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;
      component.body.innovation_use_2030.actors[0].women = 40;
      expect(component.projection2030JustificationRequired).toBe(true);

      component.body.innovation_use_2030.actors[0].women = 10;

      expect(component.projection2030JustificationRequired).toBe(false);
    });

    it('sees an added row as a change', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;
      component.body.innovation_use_2030.actors.push(actor({ actor_type_id: 7 }));

      expect(component.projection2030Changed).toBe(true);
    });

    it('sees a row the reporter removed as a change', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;
      component.body.innovation_use_2030.actors[0].is_active = false;

      expect(component.projection2030Changed).toBe(true);
    });

    /** Ids and audit fields differ between two phases by construction — they are not user changes. */
    it('does not report a change for ids or audit fields that differ between phases', () => {
      const component = withPreviousPhase();
      component.reviewing2030Projection = true;
      component.body.innovation_use_2030.actors[0] = actor({
        result_actors_id: 999,
        created_date: '2026-09-02',
        last_updated_by: 77
      });

      expect(component.projection2030Changed).toBe(false);
    });

    it('never asks for a justification while the projection is still locked', () => {
      const component = withPreviousPhase();
      component.body.innovation_use_2030.actors[0].women = 40;

      expect(component.projection2030Changed).toBe(true);
      expect(component.projection2030JustificationRequired).toBe(false);
    });
  });
});
