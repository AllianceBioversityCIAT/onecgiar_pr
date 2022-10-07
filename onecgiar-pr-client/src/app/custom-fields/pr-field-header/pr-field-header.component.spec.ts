import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrFieldHeaderComponent } from './pr-field-header.component';

describe('PrFieldHeaderComponent', () => {
  let component: PrFieldHeaderComponent;
  let fixture: ComponentFixture<PrFieldHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrFieldHeaderComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrFieldHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
