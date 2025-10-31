import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserEvidenceComponent } from './user-evidence.component';

describe('UserEvidenceComponent', () => {
  let component: UserEvidenceComponent;
  let fixture: ComponentFixture<UserEvidenceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserEvidenceComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserEvidenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
