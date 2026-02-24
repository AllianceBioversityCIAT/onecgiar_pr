import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MassivePhaseShiftComponent } from './massive-phase-shift.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MassivePhaseShiftComponent', () => {
  let component: MassivePhaseShiftComponent;
  let fixture: ComponentFixture<MassivePhaseShiftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MassivePhaseShiftComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MassivePhaseShiftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
