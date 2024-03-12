import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN2Component } from './step-n2.component';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { IpsrGreenCheckComponent } from '../../../../../../components/ipsr-green-check/ipsr-green-check.component';

describe('StepN2Component', () => {
  let component: StepN2Component;
  let fixture: ComponentFixture<StepN2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN2Component, IpsrGreenCheckComponent],
      imports: [HttpClientModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set detail section title to "Step 2" on initialization', () => {
    const spy = jest.spyOn(component.api.dataControlSE, 'detailSectionTitle');
    component.ngOnInit();
    expect(spy).toHaveBeenCalledWith('Step 2');
  });

  it('should return "basic-info" for routerStep when isAdmin is true and isStepTwoTwo is false', () => {
    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoTwo = false;
    expect(component.routerStep()).toBe('basic-info');
  });

  it('should return "../step-3" for routerStep when isAdmin is false or isStepTwoTwo is true', () => {
    component.api.rolesSE.isAdmin = false;
    component.api.isStepTwoTwo = true;
    expect(component.routerStep()).toBe('../step-3');

    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoTwo = true;
    expect(component.routerStep()).toBe('../step-3');
  });

  it('should return "complementary-innovation" for routerStepBack when isAdmin is true and isStepTwoOne is false', () => {
    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoOne = false;
    expect(component.routerStepBack()).toBe('complementary-innovation');
  });

  it('should return "../step-1" for routerStepBack when isAdmin is false or isStepTwoOne is true', () => {
    component.api.rolesSE.isAdmin = false;
    component.api.isStepTwoOne = true;
    expect(component.routerStepBack()).toBe('../step-1');

    component.api.rolesSE.isAdmin = true;
    component.api.isStepTwoOne = true;
    expect(component.routerStepBack()).toBe('../step-1');
  });
});
