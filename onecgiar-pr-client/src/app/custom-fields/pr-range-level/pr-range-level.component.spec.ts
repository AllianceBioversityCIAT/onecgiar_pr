import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrRangeLevelComponent } from './pr-range-level.component';

describe('PrRangeLevelComponent', () => {
  let component: PrRangeLevelComponent;
  let fixture: ComponentFixture<PrRangeLevelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrRangeLevelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrRangeLevelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
