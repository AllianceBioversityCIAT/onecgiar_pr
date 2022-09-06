import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdEvidencesComponent } from './rd-evidences.component';

describe('RdEvidencesComponent', () => {
  let component: RdEvidencesComponent;
  let fixture: ComponentFixture<RdEvidencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdEvidencesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdEvidencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
