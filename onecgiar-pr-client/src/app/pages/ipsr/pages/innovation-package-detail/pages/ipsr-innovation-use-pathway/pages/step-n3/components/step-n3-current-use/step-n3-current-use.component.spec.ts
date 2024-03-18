import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StepN3CurrentUseComponent } from './step-n3-current-use.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { NoDataTextComponent } from '../../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { of } from 'rxjs';

describe('StepN3CurrentUseComponent', () => {
  let component: StepN3CurrentUseComponent;
  let fixture: ComponentFixture<StepN3CurrentUseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN3CurrentUseComponent, PrFieldHeaderComponent, NoDataTextComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3CurrentUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GETAllActorsTypes and GETInstitutionsTypeTree on ngOnInit', () => {
    const spy = jest.spyOn(component, 'GETAllActorsTypes');
    const spy2 = jest.spyOn(component, 'GETInstitutionsTypeTree');
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });

  it('should call GETAllActorsTypes and set actorsTypeList ', () => {
    const spy = jest.spyOn(component.api.resultsSE, 'GETAllActorsTypes').mockReturnValue(
      of({
        response: [
          { id: 1, is_active: false },
          { id: 2, is_active: true }
        ]
      })
    );
    component.GETAllActorsTypes();
    expect(spy).toHaveBeenCalled();
    expect(component.actorsTypeList).toEqual([
      { id: 1, is_active: false },
      { id: 2, is_active: true }
    ]);
  });

  it('should call GETInstitutionsTypeTree', () => {
    const spy = jest.spyOn(component.api.resultsSE, 'GETInstitutionsTypeTree').mockReturnValue(
      of({
        response: [
          { code: 1, childrens: [1, 2] },
          { code: 2, childrens: [3, 4] }
        ]
      })
    );
    component.GETInstitutionsTypeTree();
    expect(spy).toHaveBeenCalled();
    expect(component.institutionsTypeTreeList).toEqual([
      { code: 1, childrens: [1, 2] },
      { code: 2, childrens: [3, 4] }
    ]);
  });

  it('should return the number of elements filter by attr if readOnly is true', () => {
    component.api.rolesSE.readOnly = true;
    const list = [{ id: 1, is_active: false }, { id: 2, is_active: true }, { is_active: true }];
    const result = component.hasElementsWithId(list, 'id');
    expect(result).toBe(2);
  });

  it('should return the number of elements filter by is_active if readOnly is false', () => {
    component.api.rolesSE.readOnly = false;
    const list = [{ id: 1, is_active: false }, { id: 2, is_active: false }, { is_active: true }];
    const result = component.hasElementsWithId(list, 'id');
    expect(result).toBe(1);
  });

  it('should return the childrens of the institution_types_id', () => {
    component.institutionsTypeTreeList = [
      { code: 1, childrens: [1, 2] },
      { code: 2, childrens: [3, 4] }
    ];
    const result = component.getInstitutionsTypeTreeChildrens(1);
    expect(result).toEqual([1, 2]);
  });

  it('should return an empty array if the institution_types_id does not exist', () => {
    component.institutionsTypeTreeList = [
      { code: 1, childrens: [1, 2] },
      { code: 2, childrens: [3, 4] }
    ];
    const result = component.getInstitutionsTypeTreeChildrens(3);
    expect(result).toEqual([]);
  });

  it('should return the actorTypeDescription', () => {
    const result = component.actorTypeDescription();

    expect(result).toBe(`<li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years</li><li>If age disaggregation does not apply, then please apply a 50/50% rule in dividing women or men across the youth/non-youth category</li>`);
  });

  it('should clean the actorItem', () => {
    const actor = {
      women: 123,
      women_youth: 123,
      women_non_youth: 123,
      men: 123,
      men_youth: 123,
      men_non_youth: 123,
      how_many: 123
    };

    component.cleanActor(actor);

    expect(actor).toEqual({
      women: null,
      women_youth: null,
      women_non_youth: null,
      men: null,
      men_youth: null,
      men_non_youth: null,
      how_many: null
    });
  });

  it('should reload the select', () => {
    const organizationItem = { hide: false, institution_sub_type_id: 1 };
    component.reloadSelect(organizationItem);

    expect(organizationItem.hide).toBeTruthy();
    expect(organizationItem.institution_sub_type_id).toBeNull();
  });

  it('should add an actor', () => {
    component.body.innovatonUse.actors = [];
    component.addActor();
    expect(component.body.innovatonUse.actors).toEqual([{}]);
  });

  it('should add an organization', () => {
    component.body.innovatonUse.organization = [];
    component.addOrganization();
    expect(component.body.innovatonUse.organization).toEqual([{}]);
  });

  it('should add an other', () => {
    component.body.innovatonUse.measures = [];
    component.addOther();
    expect(component.body.innovatonUse.measures).toEqual([{}]);
  });

  it('should return the list of subtypes', () => {
    component.body.innovatonUse.organization = [{ institution_sub_type_id: 1 }, { institution_sub_type_id: 2 }] as any;
    const result = component.getAllSubTypes;
    expect(result).toEqual([{ code: 1 }, { code: 2 }]);
  });

  it('should return the list of disable organizations', () => {
    component.body.innovatonUse.organization = [{ institution_sub_type_id: 1 }, { institution_sub_type_id: null, institution_types_id: 2 }] as any;
    const result = component.disableOrganizations;
    expect(result).toEqual([{ code: 2 }]);
  });

  it('should remove the organization', () => {
    const organizationItem = { institution_sub_type_id: 1, institution_types_id: 2, is_active: true };
    component.removeOrganization(organizationItem);
    expect(organizationItem).toEqual({ institution_sub_type_id: null, institution_types_id: null, is_active: false });
  });

  it('should remove the other', () => {
    const actors = [{ actor_type_id: 1 }, { actor_type_id: 5 }];
    const result = component.removeOther(actors);
    expect(result).toEqual([{ actor_type_id: 1 }]);
  });

  it('should remove the other in org', () => {
    const disableOrganizations = [{ code: 1 }, { code: 78 }];
    const result = component.removeOtherInOrg(disableOrganizations);
    expect(result).toEqual([{ code: 1 }]);
  });

  it('should set actorItem how_many if actorItem sex_and_age_disaggregation is false', () => {
    const actor = {
      sex_and_age_disaggregation: false,
      how_many: 0,
      women: 1,
      men: 2
    };

    component.calculateTotalField(actor);

    expect(actor.how_many).toBe(3);
  });

  it('should not set actorItem how_many if sex_and_age_disaggregation is true', () => {
    const actor = {
      sex_and_age_disaggregation: true,
      how_many: 0,
      women: 1,
      men: 2
    };

    component.calculateTotalField(actor);

    expect(actor.how_many).toBe(0);
  });

  it('should validate youth', () => {
    const i = 0;
    const isWomen = true;
    const actorItem = {};

    component.body.innovatonUse.actors[i] = {
      women_youth: -1,
      women: -1,
      previousWomen_youth: 0,
      previousWomen: 0,
      showWomenExplanationwomen: false,
      showWomenExplanationmen: false
    } as any;

    component.validateYouth(i, isWomen, actorItem);

    expect(component.body.innovatonUse.actors[i].women_youth).toBe(-1);
    expect(component.body.innovatonUse.actors[i].women).toBe(-1);
    expect(component.body.innovatonUse.actors[i].showWomenExplanationwomen).toBeFalsy();
    expect(component.body.innovatonUse.actors[i].previousWomen).toBe(-1);
    expect(component.body.innovatonUse.actors[i].previousWomen_youth).toBe(-1);

    component.body.innovatonUse.actors[i] = {
      women_youth: 2,
      women: 1,
      previousWomen_youth: 0,
      previousWomen: 0,
      showWomenExplanationwomen: false,
      showWomenExplanationmen: false
    } as any;

    component.validateYouth(i, isWomen, actorItem);

    expect(component.body.innovatonUse.actors[i].women_youth).toBe(2);
    expect(component.body.innovatonUse.actors[i].women).toBe(1);
    expect(component.body.innovatonUse.actors[i].showWomenExplanationwomen).toBeFalsy();
    expect(component.body.innovatonUse.actors[i].previousWomen).toBe(0);
    expect(component.body.innovatonUse.actors[i].previousWomen_youth).toBe(0);
  });

  it('should validate youth with isWomen as false', () => {
    const i = 0;
    const isWomen = false;
    const actorItem = {};

    component.body.innovatonUse.actors[i] = {
      men_youth: -1,
      men: -1,
      previousMen_youth: 0,
      previousMen: 0,
      showMenExplanationwomen: false,
      showMenExplanationmen: false
    } as any;

    component.validateYouth(i, isWomen, actorItem);

    expect(component.body.innovatonUse.actors[i].men_youth).toBe(-1);
    expect(component.body.innovatonUse.actors[i].men).toBe(-1);
    expect(component.body.innovatonUse.actors[i].showMenExplanationmen).toBeFalsy();
    expect(component.body.innovatonUse.actors[i].previousMen).toBe(0);
    expect(component.body.innovatonUse.actors[i].previousMen_youth).toBe(0);

    component.body.innovatonUse.actors[i] = {
      men_youth: 2,
      men: 1,
      previousMen_youth: 0,
      previousMen: 0,
      showMenExplanationwomen: false,
      showMenExplanationmen: false
    } as any;

    component.validateYouth(i, isWomen, actorItem);

    expect(component.body.innovatonUse.actors[i].men_youth).toBe(2);
    expect(component.body.innovatonUse.actors[i].men).toBe(1);
    expect(component.body.innovatonUse.actors[i].showMenExplanationmen).toBeFalsy();
    expect(component.body.innovatonUse.actors[i].previousMen).toBe(0);
    expect(component.body.innovatonUse.actors[i].previousMen_youth).toBe(0);
  });

  it('should return actors narrative', () => {
    const result = component.narrativeActors();
    expect(result).toBe(`
    <ul>
    <li>
    If the innovation does not target specific groups of actors or people, then please specify the expected innovation use at organizational level or other use below.
    </li>
    <li>
    The numbers for ‘youth' and 'non-youth' equal the total number for 'Women' or 'Men’.
    </li>
    </ul>
    `);
  });
});
