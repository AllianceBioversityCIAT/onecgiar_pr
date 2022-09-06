import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdPolicyInfoComponent } from './rd-policy-info.component';

describe('RdPolicyInfoComponent', () => {
  let component: RdPolicyInfoComponent;
  let fixture: ComponentFixture<RdPolicyInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdPolicyInfoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdPolicyInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
