import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrMultiSelectComponent } from './pr-multi-select.component';

describe('PrMultiSelectComponent', () => {
  let component: PrMultiSelectComponent;
  let fixture: ComponentFixture<PrMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
