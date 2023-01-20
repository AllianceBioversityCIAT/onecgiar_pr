import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitAdminSectionComponent } from './init-admin-section.component';

describe('InitAdminSectionComponent', () => {
  let component: InitAdminSectionComponent;
  let fixture: ComponentFixture<InitAdminSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InitAdminSectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitAdminSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
