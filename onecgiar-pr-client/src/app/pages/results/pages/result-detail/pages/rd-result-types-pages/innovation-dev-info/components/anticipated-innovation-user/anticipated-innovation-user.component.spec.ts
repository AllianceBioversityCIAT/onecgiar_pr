import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnticipatedInnovationUserComponent } from './anticipated-innovation-user.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FeedbackValidationDirective } from '../../../../../../../../../shared/directives/feedback-validation.directive';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { AddButtonComponent } from '../../../../../../../../../custom-fields/add-button/add-button.component';
import { Actor, Measure, Organization } from '../../model/innovationDevInfoBody';

describe('AnticipatedInnovationUserComponent', () => {
  let component: AnticipatedInnovationUserComponent;
  let fixture: ComponentFixture<AnticipatedInnovationUserComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GETAllActorsTypes: () => of({ response: [] }),
        GETInstitutionsTypeTree: () => of({ response: [] }),
      },
      rolesSE: {
        readOnly: false
      }
    }
    await TestBed.configureTestingModule({
      declarations: [
        AnticipatedInnovationUserComponent,
        NoDataTextComponent,
        PrFieldHeaderComponent,
        PrRadioButtonComponent,
        FeedbackValidationDirective,
        AddButtonComponent
      ],
      imports: [
        HttpClientTestingModule,
        RadioButtonModule,
        FormsModule
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(AnticipatedInnovationUserComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should call GETAllActorsTypes() and GETInstitutionsTypeTree on initialization', () => {
      const spy = jest.spyOn(component, 'GETAllActorsTypes');
      const spyGETInstitutionsTypeTree = jest.spyOn(component, 'GETInstitutionsTypeTree');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
      expect(spyGETInstitutionsTypeTree).toHaveBeenCalled();
    });
  });

  describe('checkAlert()', () => {
    it('should check if alert is needed when innovation_user_to_be_determined is false', () => {
      component.body.innovatonUse.actors = [
        {
          actor_type_id: 1,
          women: 1,
          women_youth: 1,
          men: 1,
          men_youth: 1,
          is_active: false,
          women_non_youth: 1,
          men_non_youth: 1,
          previousWomen: 1,
          previousWomen_youth: 1,
          other_actor_type: 1,
          sex_and_age_disaggregation: false,
          how_many: 1,
          result_actors_id: 1,
          has_men: false,
          has_men_youth: false,
          has_women: false,
          has_women_youth: false
        }
      ];
      component.body.innovatonUse.organization = [
        {
          is_active: true,
          institution_types_id: 1,
          institution_sub_type_id: 1,
          how_many: 1,
          other_institution: '',
          graduate_students: '',
          hide: false,
          id: 1
        }
      ];

      component.body.innovatonUse.measures = [
        {
          is_active: true,
          unit_of_measure: '',
          quantity: 1,
          result_ip_measure_id: 1
        }
      ];
      component.body.innovation_user_to_be_determined = false

      const alertNeeded = component.checkAlert();

      expect(alertNeeded).toBeTruthy();
    });
    it('should check if alert is not needed when no actors, organizations, or measures', () => {
      component.body.innovatonUse.actors = [];
      component.body.innovatonUse.organization = [];
      component.body.innovatonUse.measures = [];
      component.body.innovation_user_to_be_determined = false

      const alertNeeded = component.checkAlert();

      expect(alertNeeded).toBeFalsy();
    });

    it('should check if alert is needed when innovation_user_to_be_determined is true', () => {
      component.body.innovation_user_to_be_determined = true

      const alertNeeded = component.checkAlert();

      expect(alertNeeded).toBeTruthy();
    });
  });

  describe('GETAllActorsTypes()', () => {
    it('should get actors types and set actorsTypeList', () => {
      const getActorsTypesSpy = jest.spyOn(mockApiService.resultsSE, 'GETAllActorsTypes');

      component.GETAllActorsTypes();

      expect(getActorsTypesSpy).toHaveBeenCalled();
      expect(component.actorsTypeList).toEqual([]);
    });
  });

  describe('GETInstitutionsTypeTree()', () => {
    it('should get insitutions type tree and set institutionsTypeTreeList', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'GETInstitutionsTypeTree');

      component.GETInstitutionsTypeTree();

      expect(spy).toHaveBeenCalled();
      expect(component.actorsTypeList).toEqual([]);
    });
  });

  describe('getInstitutionsTypeTreeChildrens()', () => {
    it('should return children for a given institution type', () => {
      const institution_types_id = 1;
      const institutionsTypeTreeList = [
        { code: 1, childrens: [{ id: 11, name: 'Child 1' }, { id: 12, name: 'Child 2' }] },
        { code: 2, childrens: [{ id: 21, name: 'Child 3' }, { id: 22, name: 'Child 4' }] },
      ];
      component.institutionsTypeTreeList = institutionsTypeTreeList;

      const result = component.getInstitutionsTypeTreeChildrens(institution_types_id);

      expect(result).toEqual([{ id: 11, name: 'Child 1' }, { id: 12, name: 'Child 2' }]);
    });

    it('should return an empty array if institution type is not found', () => {
      const institution_types_id = 3;
      const institutionsTypeTreeList = [
        { code: 1, childrens: [{ id: 11, name: 'Child 1' }, { id: 12, name: 'Child 2' }] },
        { code: 2, childrens: [{ id: 21, name: 'Child 3' }, { id: 22, name: 'Child 4' }] },
      ];
      component.institutionsTypeTreeList = institutionsTypeTreeList;

      const result = component.getInstitutionsTypeTreeChildrens(institution_types_id);

      expect(result).toEqual([]);
    });
  });

  describe('removeOrganization()', () => {
    it('should set is_active to false for existing organization with id', () => {
      const organizationItem = {
        id: 1,
        name: 'Organization 1',
        institution_types_id: 2,
        institution_sub_type_id: 3,
        is_active: false
      };
      const index = 0;

      component.removeOrganization(organizationItem, index);

      expect(organizationItem.is_active).toBeFalsy();
      expect(organizationItem.institution_types_id).toBeNull();
      expect(organizationItem.institution_sub_type_id).toBeNull();
    });
    it('should remove organization from the list if id is not present', () => {
      const organizationItem = {
        name: 'New Organization',
        institution_types_id: 4,
        institution_sub_type_id: 5
      };
      const index = 1;
      const organization = {
        id: 1,
        institution_types_id: 2,
        institution_sub_type_id: 3,
        how_many: 1,
        other_institution: '',
        graduate_students: '',
        hide: false,
        is_active: true
      }
      component.body.innovatonUse.organization = [organization];

      component.removeOrganization(organizationItem, index);

      expect(component.body.innovatonUse.organization.length).toBe(1);
      expect(component.body.innovatonUse.organization[0]).toEqual(organization);
    });
  });

  describe('removeActor()', () => {
    it('should set is_active to false for existing actor with result_actors_id', () => {
      const actorItem = {
        result_actors_id: 1,
        name: 'Actor 1',
        actor_type_id: 2,
        is_active: true
      };
      const index = 0;

      component.removeActor(actorItem, index);

      expect(actorItem.is_active).toBeFalsy();
      expect(actorItem.actor_type_id).toBeNull();
    });
    it('should remove actor from the list if result_actors_id is not present', () => {
      const actorItem = { name: 'New Actor', actor_type_id: 4 };
      const index = 1;
      const actors = {
        actor_type_id: 1,
        women: 1,
        women_youth: 1,
        men: 1,
        men_youth: 1,
        is_active: false,
        women_non_youth: 1,
        men_non_youth: 1,
        previousWomen: 1,
        previousWomen_youth: 1,
        other_actor_type: 1,
        sex_and_age_disaggregation: false,
        how_many: 1,
        result_actors_id: 1,
        has_men: false,
        has_men_youth: false,
        has_women: false,
        has_women_youth: false
      }
      component.body.innovatonUse.actors = [actors];

      component.removeActor(actorItem, index);

      expect(component.body.innovatonUse.actors.length).toBe(1);
      expect(component.body.innovatonUse.actors[0]).toEqual(actors);
    });
  });

  describe('reloadSelect()', () => {
    it('should hide and reset institution_sub_type_id with a delay', () => {
      jest.useFakeTimers();
      const organizationItem = { hide: false, institution_sub_type_id: 123 };

      component.reloadSelect(organizationItem);
      expect(organizationItem.hide).toBeTruthy();
      jest.runAllTimers();

      expect(organizationItem.institution_sub_type_id).toBeNull();
      expect(organizationItem.hide).toBeFalsy();
    });
  });

  describe('removeOtherInOrg()', () => {
    it('should remove items with code 78 from disableOrganizations', () => {
      const disableOrganizations = [
        { code: 123 },
        { code: 78 },
        { code: 456 },
      ];
  
      const result = component.removeOtherInOrg(disableOrganizations);

      expect(result).toHaveLength(2);
      expect(result.some(item => item.code === 78)).toBeFalsy();
    });
  });

  describe('addOrganization()', () => {
    it('should add a new organization to the list', () => {
      const currentLength = component.body.innovatonUse.organization.length;
  
      component.addOrganization();
  
      expect(component.body.innovatonUse.organization).toHaveLength(currentLength + 1);
      expect(component.body.innovatonUse.organization[currentLength]).toBeInstanceOf(Organization);
    });
  });

  describe('disableOrganizations()', () => {
    it('should return a list of disabled organizations', () => {
      const organization =  {
        is_active: true,
        institution_types_id: 1,
        institution_sub_type_id: null,
        how_many: 1,
        other_institution: '',
        graduate_students: '',
        hide: false,
        id: 1
      }
      component.body.innovatonUse.organization = [organization];
  
      const result = component.disableOrganizations;
  
      expect(result).toEqual([{code:1}])
    });
  });

  describe('getAllSubTypes()', () => {
    it('should return a list of all subtypes', () => {
      const organization =  {
        is_active: true,
        institution_types_id: 1,
        institution_sub_type_id: 2,
        how_many: 1,
        other_institution: '',
        graduate_students: '',
        hide: false,
        id: 1
      }
      component.body.innovatonUse.organization = [organization];
  
      const result = component.getAllSubTypes;
  
      expect(result).toEqual([{code:2}])
    });
  });

  describe('hasElementsWithId()', () => {
    it('should filter elements when rolesSE.readOnly is false', () => {
      const list = [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
        { id: 3, is_active: true },
      ];
  
      const result = component.hasElementsWithId(list, 'id');
  
      expect(typeof result === 'number').toBeTruthy();
      expect(result).toBe(2); 
    });
    it('should filter elements when rolesSE.readOnly is true', () => {
      mockApiService.rolesSE.readOnly = true;
      const list = [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
        { id: 3, is_active: true },
      ];
  
      const result = component.hasElementsWithId(list, 'id');
  
      expect(typeof result === 'number').toBeTruthy();
      expect(result).toBe(3); 
    });
  });

  describe('actorDescription()', () => {
    it('should return a string with actor description', () => {
      const description = component.actorDescription();

      expect(description).toContain("If the innovation does not target specific groups of actors or people");
      expect(description).toContain("CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years.");
      expect(description).toContain("We are currently working to include broader diversity dimensions beyond male, female and youth, which will be implemented in future reporting periods.");
    });
  });

  describe('removeOther()', () => {
    it('should remove actors with actor_type_id equal to 5', () => {
      const actors = [
        { actor_type_id: 1 },
        { actor_type_id: 5 },
        { actor_type_id: 3 },
      ];
  
      const filteredActors = component.removeOther(actors);
  
      expect(filteredActors).toHaveLength(2);
      expect(filteredActors.every(actor => actor.actor_type_id !== 5)).toBeTruthy();
    });
  });

  describe('addActor()', () => {
    it('should add a new actor to the list', () => {
      const initialActorsLength = component.body.innovatonUse.actors.length;
  
      component.addActor();
  
      const newActorsLength = component.body.innovatonUse.actors.length;
      expect(newActorsLength).toBe(initialActorsLength + 1);
      expect(component.body.innovatonUse.actors[newActorsLength - 1]).toBeInstanceOf(Actor);
    });
  });

  describe('addOtherMesure()', () => {
    it('should add a new measure to the list', () => {
      const initialMeasuresLength = component.body.innovatonUse.measures.length;
  
      component.addOtherMesure();
  
      const newMeasuresLength = component.body.innovatonUse.measures.length;
      expect(newMeasuresLength).toBe(initialMeasuresLength + 1);
      expect(component.body.innovatonUse.measures[newMeasuresLength - 1]).toBeInstanceOf(Measure);
    });
  });

  describe('cleanActor()', () => {
    it('should clean the actor properties', () => {
      const actorItem = {
        sex_and_age_disaggregation: true,
        has_men: true,
        has_men_youth: true,
        has_women: true,
        has_women_youth: true,
        women: 'some value',
        women_youth: 'some value',
        women_non_youth: 'some value',
        men: 'some value',
        men_youth: 'some value',
        men_non_youth: 'some value',
        how_many: 'some value'
      };
  
      component.cleanActor(actorItem);
  
      expect(actorItem.has_men).toBeFalsy();
      expect(actorItem.has_men_youth).toBeFalsy();
      expect(actorItem.has_women).toBeFalsy();
      expect(actorItem.has_women_youth).toBeFalsy();
      expect(actorItem.women).toBeNull();
      expect(actorItem.women_youth).toBeNull();
      expect(actorItem.women_non_youth).toBeNull();
      expect(actorItem.men).toBeNull();
      expect(actorItem.men_youth).toBeNull();
      expect(actorItem.men_non_youth).toBeNull();
      expect(actorItem.how_many).toBeNull();
    });
  });
});
