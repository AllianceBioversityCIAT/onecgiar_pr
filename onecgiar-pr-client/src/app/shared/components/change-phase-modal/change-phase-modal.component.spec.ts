import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangePhaseModalComponent } from './change-phase-modal.component';
import { HttpClientModule } from '@angular/common/http';

describe('ChangePhaseModalComponent', () => {
  let component: ChangePhaseModalComponent;
  let fixture: ComponentFixture<ChangePhaseModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangePhaseModalComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePhaseModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
