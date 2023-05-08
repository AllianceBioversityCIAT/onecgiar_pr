import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3ComplementaryInnovationsComponent } from './step-n3-complementary-innovations.component';

describe('StepN3ComplementaryInnovationsComponent', () => {
  let component: StepN3ComplementaryInnovationsComponent;
  let fixture: ComponentFixture<StepN3ComplementaryInnovationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN3ComplementaryInnovationsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN3ComplementaryInnovationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
