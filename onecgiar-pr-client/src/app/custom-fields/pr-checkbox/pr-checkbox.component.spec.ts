import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrCheckboxComponent } from './pr-checkbox.component';

describe('PrCheckboxComponent', () => {
  let component: PrCheckboxComponent;
  let fixture: ComponentFixture<PrCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrCheckboxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
