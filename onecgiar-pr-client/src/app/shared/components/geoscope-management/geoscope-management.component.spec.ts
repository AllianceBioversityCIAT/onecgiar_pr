import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoscopeManagementComponent } from './geoscope-management.component';

describe('GeoscopeManagementComponent', () => {
  let component: GeoscopeManagementComponent;
  let fixture: ComponentFixture<GeoscopeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GeoscopeManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeoscopeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
