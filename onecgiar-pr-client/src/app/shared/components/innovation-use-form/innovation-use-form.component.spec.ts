import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationUseFormComponent } from './innovation-use-form.component';
import { ApiService } from '../../services/api/api.service';
import { of } from 'rxjs';
import {
  IpsrStep1Body,
  Actor,
  Organization,
  Measure
} from '../../../pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

describe('InnovationUseFormComponent', () => {
  let component: InnovationUseFormComponent;
  let fixture: ComponentFixture<InnovationUseFormComponent>;
  let apiServiceMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      resultsSE: {
        GETAllActorsTypes: jest.fn().mockReturnValue(of({ response: [] })),
        GETInstitutionsTypeTree: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: {
        readOnly: false
      }
    };

    await TestBed.configureTestingModule({
      declarations: [InnovationUseFormComponent],
      providers: [{ provide: ApiService, useValue: apiServiceMock }]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InnovationUseFormComponent);
    component = fixture.componentInstance;
    component.body = new IpsrStep1Body();
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
      how_many: null
    });
  });

  it('should add new actor', () => {
    component.body.innovatonUse.actors = [];
    component.addActor();
    expect(component.body.innovatonUse.actors.length).toBe(1);
    expect(component.body.innovatonUse.actors[0]).toBeInstanceOf(Actor);
  });

  it('should add new organization', () => {
    component.body.innovatonUse.organization = [];
    component.addOrganization();
    expect(component.body.innovatonUse.organization.length).toBe(1);
    expect(component.body.innovatonUse.organization[0]).toBeInstanceOf(Organization);
  });

  it('should add new measure', () => {
    component.body.innovatonUse.measures = [];
    component.addOther();
    expect(component.body.innovatonUse.measures.length).toBe(1);
    expect(component.body.innovatonUse.measures[0]).toBeInstanceOf(Measure);
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
    const organizationItem = { hide: false, institution_sub_type_id: 1 } as any;
    component.reloadSelect(organizationItem);
    expect(organizationItem.hide).toBe(true);
    expect(organizationItem.institution_sub_type_id).toBeNull();
    setTimeout(() => {
      expect(organizationItem.hide).toBe(false);
    }, 300);
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

  // Add more tests for other functionalities as needed
});
