import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaseSwitcherComponent } from './phase-switcher.component';

describe('PhaseSwitcherComponent', () => {
  let component: PhaseSwitcherComponent;
  let fixture: ComponentFixture<PhaseSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PhaseSwitcherComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhaseSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
