import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangePhaseModalComponent } from './change-phase-modal.component';

describe('ChangePhaseModalComponent', () => {
  let component: ChangePhaseModalComponent;
  let fixture: ComponentFixture<ChangePhaseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangePhaseModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangePhaseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
