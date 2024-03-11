import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { StepN1ExpertsComponent } from './step-n1-experts.component';
import { NoDataTextComponent } from '../../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { RadioButtonModule } from 'primeng/radiobutton';

describe('StepN1ExpertsComponent', () => {
  let component: StepN1ExpertsComponent;
  let fixture: ComponentFixture<StepN1ExpertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1ExpertsComponent, NoDataTextComponent, PrFieldHeaderComponent, PrRadioButtonComponent],
      imports: [HttpClientTestingModule, FormsModule, RadioButtonModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StepN1ExpertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize expertisesList', () => {
    expect(component.expertisesList).toEqual([]);
  });

  it('should initialize engagingOptions', () => {
    expect(component.engagingOptions).toEqual([
      { id: true, name: 'Yes, the group of experts is diverse' },
      { id: false, name: 'No, the list of experts is not yet as diverse as desired and can be improved by adding the following expert groups:' }
    ]);
  });

  it('should call GETAllInnovationPackagingExpertsExpertises on constructor initialization', () => {
    const spy = jest.spyOn(component, 'GETAllInnovationPackagingExpertsExpertises');
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
    expect(component.expertisesList).toEqual([]);
  });

  it('should add a new expert to body.experts when addExpert is called', () => {
    const initialExpertsCount = component.body.experts.length;
    component.addExpert();
    expect(component.body.experts.length).toBe(initialExpertsCount + 1);
  });

  it('should return number of elements with ID when readonly is true', () => {
    const list = [
      { id: 1, is_active: true },
      { id: 2, is_active: true },
      { id: 3, is_active: false }
    ];
    const attr = 'id';
    component.api.rolesSE.readOnly = true;

    expect(component.hasElementsWithId(list, attr)).toBe(3);
  });

  it('should return number of elements with ID when readonly is false', () => {
    const list = [
      { id: 1, is_active: true },
      { id: 2, is_active: true },
      { id: 3, is_active: false }
    ];
    const attr = 'name';
    component.api.rolesSE.readOnly = false;

    expect(component.hasElementsWithId(list, attr)).toBe(2);
  });

  it('should return the narrative actors as a formatted string when narrativeActors is called', () => {
    const expectedString = `
    <ul>
    <li>
    An IPSR expert workshop should have around 25 experts, confirmed through RSVPs to maintain a manageable group size.
    </li>
    <li>
    To design a realistic innovation package, the engagement of a diverse group of experts is recommended. Please consider the following scaling expertises when developing the invitee list for the innovation packaging and scaling readiness assessment workshop</li>
    </ul>
    `;
    expect(component.narrativeActors()).toBe(expectedString);
  });
});
