import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PolicyChangeInfoComponent } from './policy-change-info.component';

describe('PolicyChangeInfoComponent', () => {
  let component: PolicyChangeInfoComponent;
  let fixture: ComponentFixture<PolicyChangeInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PolicyChangeInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyChangeInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
