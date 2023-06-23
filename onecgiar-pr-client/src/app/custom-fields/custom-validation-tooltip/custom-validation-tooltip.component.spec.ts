import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomValidationTooltipComponent } from './custom-validation-tooltip.component';

describe('CustomValidationTooltipComponent', () => {
  let component: CustomValidationTooltipComponent;
  let fixture: ComponentFixture<CustomValidationTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CustomValidationTooltipComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomValidationTooltipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
