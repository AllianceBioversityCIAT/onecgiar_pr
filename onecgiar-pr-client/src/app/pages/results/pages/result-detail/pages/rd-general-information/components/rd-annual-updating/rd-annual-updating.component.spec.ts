import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdAnnualUpdatingComponent } from './rd-annual-updating.component';

describe('RdAnnualUpdatingComponent', () => {
  let component: RdAnnualUpdatingComponent;
  let fixture: ComponentFixture<RdAnnualUpdatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RdAnnualUpdatingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdAnnualUpdatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
