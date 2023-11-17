import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmationKPComponent } from './confirmation-kp.component';

describe('ConfirmationKPComponent', () => {
  let component: ConfirmationKPComponent;
  let fixture: ComponentFixture<ConfirmationKPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmationKPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmationKPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
