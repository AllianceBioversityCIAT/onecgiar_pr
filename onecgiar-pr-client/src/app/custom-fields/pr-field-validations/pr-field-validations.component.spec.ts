import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrFieldValidationsComponent } from './pr-field-validations.component';

describe('PrFieldValidationsComponent', () => {
  let component: PrFieldValidationsComponent;
  let fixture: ComponentFixture<PrFieldValidationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrFieldValidationsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrFieldValidationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
