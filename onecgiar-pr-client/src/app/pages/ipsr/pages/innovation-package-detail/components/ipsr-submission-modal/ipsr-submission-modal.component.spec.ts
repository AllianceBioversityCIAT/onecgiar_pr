import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrSubmissionModalComponent } from './ipsr-submission-modal.component';

describe('IpsrSubmissionModalComponent', () => {
  let component: IpsrSubmissionModalComponent;
  let fixture: ComponentFixture<IpsrSubmissionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrSubmissionModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrSubmissionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
