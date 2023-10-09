import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmationModalKPComponent } from './confirmation-modal-kp.component';

describe('ConfirmationModalKPComponent', () => {
  let component: ConfirmationModalKPComponent;
  let fixture: ComponentFixture<ConfirmationModalKPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmationModalKPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmationModalKPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
