import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3CurrentUseComponent } from './step-n3-current-use.component';

describe('StepN3CurrentUseComponent', () => {
  let component: StepN3CurrentUseComponent;
  let fixture: ComponentFixture<StepN3CurrentUseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN3CurrentUseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN3CurrentUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
