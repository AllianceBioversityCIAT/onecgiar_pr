import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrUnsubmitModalComponent } from './ipsr-unsubmit-modal.component';

describe('IpsrUnsubmitModalComponent', () => {
  let component: IpsrUnsubmitModalComponent;
  let fixture: ComponentFixture<IpsrUnsubmitModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrUnsubmitModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrUnsubmitModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
