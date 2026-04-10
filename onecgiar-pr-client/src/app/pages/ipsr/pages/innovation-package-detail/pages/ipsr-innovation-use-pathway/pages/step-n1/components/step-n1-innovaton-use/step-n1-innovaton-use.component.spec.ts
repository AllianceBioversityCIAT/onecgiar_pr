import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StepN1InnovatonUseComponent } from './step-n1-innovaton-use.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { NoDataTextComponent } from '../../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { of } from 'rxjs';
import { Actor } from '../../model/Ipsr-step-1-body.model';

describe('StepN1InnovatonUseComponent', () => {
  let component: StepN1InnovatonUseComponent;
  let fixture: ComponentFixture<StepN1InnovatonUseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1InnovatonUseComponent, PrFieldHeaderComponent, NoDataTextComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1InnovatonUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize actorsTypeList and institutionsTypeTreeList', () => {
    expect(component.actorsTypeList).toEqual([]);
    expect(component.institutionsTypeTreeList).toEqual([]);
  });

  it('should call GETAllActorsTypes and GETInstitutionsTypeTree methods on component creation', () => {
    jest.spyOn(component, 'GETAllActorsTypes');
    jest.spyOn(component, 'GETInstitutionsTypeTree');

    component.ngOnInit();

    expect(component.GETAllActorsTypes).toHaveBeenCalled();
    expect(component.GETInstitutionsTypeTree).toHaveBeenCalled();
  });

  it('should populate actorsTypeList with response from GETAllActorsTypes API', () => {
    const mockResponse = {
      response: [
        { id: 1, name: 'Actor 1' },
        { id: 2, name: 'Actor 2' }
      ]
    };
    jest.spyOn(component.api.resultsSE, 'GETAllActorsTypes').mockReturnValue(of(mockResponse));

    component.GETAllActorsTypes();

    expect(component.actorsTypeList).toEqual([
      { id: 1, name: 'Actor 1' },
      { id: 2, name: 'Actor 2' }
    ]);
  });

  it('should populate institutionsTypeTreeList with response from GETInstitutionsTypeTree API', () => {
    const mockResponse = {
      response: [
        { id: 1, name: 'Institution 1' },
        { id: 2, name: 'Institution 2' }
      ]
    };
    jest.spyOn(component.api.resultsSE, 'GETInstitutionsTypeTree').mockReturnValue(of(mockResponse));

    component.GETInstitutionsTypeTree();

    expect(component.institutionsTypeTreeList).toEqual([
      { id: 1, name: 'Institution 1' },
      { id: 2, name: 'Institution 2' }
    ]);
  });

  it('should return childrens of institutionsTypeTreeList based on institution_types_id', () => {
    component.institutionsTypeTreeList = [
      {
        code: 1,
        childrens: [
          { id: 1, name: 'Child 1' },
          { id: 2, name: 'Child 2' }
        ]
      },
      {
        code: 2,
        childrens: [
          { id: 3, name: 'Child 3' },
          { id: 4, name: 'Child 4' }
        ]
      }
    ];

    const childrens = component.getInstitutionsTypeTreeChildrens(1);

    expect(childrens).toEqual([
      { id: 1, name: 'Child 1' },
      { id: 2, name: 'Child 2' }
    ]);
  });

  it('should return an empty array if institution_types_id is not found in institutionsTypeTreeList', () => {
    component.institutionsTypeTreeList = [
      {
        code: 1,
        childrens: [
          { id: 1, name: 'Child 1' },
          { id: 2, name: 'Child 2' }
        ]
      },
      {
        code: 2,
        childrens: [
          { id: 3, name: 'Child 3' },
          { id: 4, name: 'Child 4' }
        ]
      }
    ];

    const childrens = component.getInstitutionsTypeTreeChildrens(3);

    expect(childrens).toEqual([]);
  });

  it('should return actorTypeDescription', () => {
    const expectedDescription = `<li>CGIAR follows the United Nations definition of 'youth' as those persons between the ages of 15 and 24 years</li><li>If age disaggregation does not apply, then please apply a 50/50% rule in dividing women or men across the youth/non-youth category</li>`;

    const description = component.actorTypeDescription();

    expect(description).toEqual(expectedDescription);
  });

  it('should clean actorItem properties', () => {
    const actorItem = {
      women: 10,
      women_youth: 5,
      women_non_youth: 5,
      men: 10,
      men_youth: 5,
      men_non_youth: 5,
      how_many: 20
    };

    component.cleanActor(actorItem);

    expect(actorItem.women).toBeNull();
    expect(actorItem.women_youth).toBeNull();
    expect(actorItem.women_non_youth).toBeNull();
    expect(actorItem.men).toBeNull();
    expect(actorItem.men_youth).toBeNull();
    expect(actorItem.men_non_youth).toBeNull();
    expect(actorItem.how_many).toBeNull();
  });

  it('should hide and show organizationItem after a delay', () => {
    const organizationItem = { hide: false, institution_sub_type_id: 123 };
    const detectChangesSpy = jest.spyOn(component['cdr'], 'detectChanges');

    component.reloadSelect(organizationItem);

    expect(organizationItem.institution_sub_type_id).toBeNull();
    expect(organizationItem.hide).toBeFalsy();
    expect(detectChangesSpy).toHaveBeenCalledTimes(1);
  });

  it('should add a new actor to body.innovatonUse.actors', () => {
    const initialLength = component.body.innovatonUse.actors.length;

    component.addActor();

    expect(component.body.innovatonUse.actors.length).toBe(initialLength + 1);
  });

  it('should add a new organization to body.innovatonUse.organization', () => {
    const initialLength = component.body.innovatonUse.organization.length;

    component.addOrganization();

    expect(component.body.innovatonUse.organization.length).toBe(initialLength + 1);
  });

  it('should add a new measure to body.innovatonUse.measures', () => {
    const initialLength = component.body.innovatonUse.measures.length;

    component.addOther();

    expect(component.body.innovatonUse.measures.length).toBe(initialLength + 1);
  });

  it('should return a list of institution_sub_type_id from body.innovatonUse.organization', () => {
    component.body.innovatonUse.organization = [
      { institution_sub_type_id: 1 },
      { institution_sub_type_id: 2 },
      { institution_sub_type_id: 3 }
    ] as any;

    const subTypes = component.getAllSubTypes;

    expect(subTypes).toEqual([{ code: 1 }, { code: 2 }, { code: 3 }]);
  });

  it('should remove actors with actor_type_id equal to 5 from the given array', () => {
    const actors = [
      { actor_type_id: 1, name: 'Actor 1' },
      { actor_type_id: 5, name: 'Actor 2' },
      { actor_type_id: 3, name: 'Actor 3' }
    ];

    const filteredActors = component.removeOther(actors);

    expect(filteredActors).toEqual([
      { actor_type_id: 1, name: 'Actor 1' },
      { actor_type_id: 3, name: 'Actor 3' }
    ]);
  });

  it('should remove organizations with code equal to 78 from the given array', () => {
    const organizations = [
      { code: 1, name: 'Organization 1' },
      { code: 78, name: 'Organization 2' },
      { code: 3, name: 'Organization 3' }
    ];

    const filteredOrganizations = component.removeOtherInOrg(organizations);

    expect(filteredOrganizations).toEqual([
      { code: 1, name: 'Organization 1' },
      { code: 3, name: 'Organization 3' }
    ]);
  });

  it('should calculate the total field based on the values of women and men properties', () => {
    const actorItem = { sex_and_age_disaggregation: false, women: 5, men: 10, how_many: null };

    component.calculateTotalField(actorItem);

    expect(actorItem.how_many).toBe(15);
  });

  it('should return a list of organizations without institution_sub_type_id', () => {
    component.body.innovatonUse.organization = [
      { institution_sub_type_id: 1, institution_types_id: 1 },
      { institution_sub_type_id: null, institution_types_id: 2 },
      { institution_sub_type_id: 3, institution_types_id: 3 }
    ] as any;

    const disableOrganizations = component.disableOrganizations;

    expect(disableOrganizations).toEqual([{ code: 2 }]);
  });

  it('should return true if the list contains elements with the given attribute', () => {
    const list = [
      { id: 1, name: 'Item 1', is_active: true },
      { id: 2, name: 'Item 2', is_active: false },
      { id: 3, name: 'Item 3', is_active: true }
    ];
    component.api.rolesSE.readOnly = true;
    const hasElements = component.hasElementsWithId(list, 'id');

    expect(hasElements).toBe(3);
  });

  it('should return false if the list does not contain elements with the given attribute', () => {
    const list = [
      { id: 1, name: 'Item 1', is_active: true },
      { id: 2, name: 'Item 2', is_active: false },
      { id: 3, name: 'Item 3', is_active: false }
    ];
    component.api.rolesSE.readOnly = false;
    const hasElements = component.hasElementsWithId(list, 'id');

    expect(hasElements).toBe(1);
  });

  it('should remove organizationItem properties', () => {
    const organizationItem = {
      institution_sub_type_id: 1,
      institution_types_id: 2,
      is_active: true
    };

    component.removeOrganization(organizationItem);

    expect(organizationItem.institution_sub_type_id).toBeNull();
    expect(organizationItem.institution_types_id).toBeNull();
    expect(organizationItem.is_active).toBe(false);
  });

  it('should validate youth properties and update the values accordingly', () => {
    const actorItem = {
      women: 10,
      women_youth: 5,
      women_non_youth: 5,
      men: 10,
      men_youth: 5,
      men_non_youth: 5,
      previousWomen: 10,
      previousWomen_youth: 5,
      showWomenExplanationwomen: false,
      showWomenExplanationmen: false,
      how_many: 20
    };

    component.body.innovatonUse.actors = [
      {
        women_youth: 2,
        previousWomen_youth: 2,
        how_many: 0,
        women_non_youth: null,
        men_youth: 2,
        men_non_youth: null
      }
    ] as Actor[];

    component.validateYouth(0, true, actorItem);

    expect(actorItem.women_youth).toBe(5);
    expect(actorItem.women).toBe(10);
    expect(actorItem.showWomenExplanationwomen).toBe(false);
    expect(actorItem.how_many).toBe(20);
  });

  it('should return narrativeActors description', () => {
    const description = component.narrativeActors();

    expect(description).toContain('<ul>');
    expect(description).toContain('expected innovation use by end of 2024');
    expect(description).toContain('youth');
    expect(description).toContain('non-youth');
    expect(description).toContain('Women');
    expect(description).toContain('Men');
    expect(description).toContain('</ul>');
  });

  describe('calculateTotalField branches', () => {
    it('should not overwrite how_many when sex_and_age_disaggregation is true', () => {
      const actorItem = { sex_and_age_disaggregation: true, women: 5, men: 10, how_many: 99 };
      component.calculateTotalField(actorItem);
      expect(actorItem.how_many).toBe(99);
    });

    it('should handle null women and men values', () => {
      const actorItem = { sex_and_age_disaggregation: false, women: null, men: null, how_many: null };
      component.calculateTotalField(actorItem);
      expect(actorItem.how_many).toBe(0);
    });
  });

  describe('hasElementsWithId branches', () => {
    it('should filter by attribute when readOnly is true', () => {
      component.api.rolesSE.readOnly = true;
      const list = [
        { id: 1, is_active: true },
        { id: null, is_active: true },
        { id: 3, is_active: false }
      ];
      expect(component.hasElementsWithId(list, 'id')).toBe(2);
    });

    it('should filter by is_active when readOnly is false', () => {
      component.api.rolesSE.readOnly = false;
      const list = [
        { id: 1, is_active: true },
        { id: 2, is_active: false },
        { id: 3, is_active: true }
      ];
      expect(component.hasElementsWithId(list, 'id')).toBe(2);
    });

    it('should return 0 for empty list', () => {
      component.api.rolesSE.readOnly = false;
      expect(component.hasElementsWithId([], 'id')).toBe(0);
    });
  });

  describe('validateYouth branches', () => {
    it('should handle negative gender youth value', (done) => {
      component.body.innovatonUse.actors = [
        {
          women: 10,
          women_youth: -1,
          women_non_youth: null,
          men: 5,
          men_youth: 2,
          men_non_youth: null,
          previousWomen: 10,
          previousWomen_youth: 5,
          sex_and_age_disaggregation: false,
          how_many: null
        }
      ] as any;

      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, true, actorItem);

      setTimeout(() => {
        expect(component.body.innovatonUse.actors[0].women_youth).toBeNull();
        done();
      }, 200);
    });

    it('should handle negative gender value', (done) => {
      component.body.innovatonUse.actors = [
        {
          women: -1,
          women_youth: 0,
          women_non_youth: null,
          men: 5,
          men_youth: 2,
          men_non_youth: null,
          previousWomen: 10,
          previousWomen_youth: 5,
          sex_and_age_disaggregation: false,
          how_many: null
        }
      ] as any;

      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, true, actorItem);

      setTimeout(() => {
        expect(component.body.innovatonUse.actors[0].women).toBe(0);
        done();
      }, 200);
    });

    it('should handle men gender (isWomen=false)', () => {
      component.body.innovatonUse.actors = [
        {
          women: 5,
          women_youth: 2,
          women_non_youth: null,
          men: 10,
          men_youth: 3,
          men_non_youth: null,
          previousWomen: 5,
          previousWomen_youth: 2,
          sex_and_age_disaggregation: false,
          how_many: null
        }
      ] as any;

      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, false, actorItem);

      expect(component.body.innovatonUse.actors[0].previousWomen).toBe(10);
      expect(component.body.innovatonUse.actors[0].previousWomen_youth).toBe(3);
    });

    it('should trigger showWomenExplanation when gender - genderYouth < 0', (done) => {
      component.body.innovatonUse.actors = [
        {
          women: 2,
          women_youth: 5,
          women_non_youth: null,
          men: 5,
          men_youth: 2,
          men_non_youth: null,
          previousWomen: 10,
          previousWomen_youth: 3,
          sex_and_age_disaggregation: false,
          how_many: null
        }
      ] as any;

      const actorItem = component.body.innovatonUse.actors[0];
      component.validateYouth(0, true, actorItem);

      setTimeout(() => {
        // After the timer fires, previousWomen values should be restored
        expect(component.body.innovatonUse.actors[0].women_youth).toBe(3);
        expect(component.body.innovatonUse.actors[0].women).toBe(10);
        done();
      }, 600);
    });
  });
});
