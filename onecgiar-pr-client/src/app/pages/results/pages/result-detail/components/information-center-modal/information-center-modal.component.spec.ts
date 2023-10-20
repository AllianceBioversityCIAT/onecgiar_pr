import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformationCenterModalComponent } from './information-center-modal.component';

describe('InformationCenterModalComponent', () => {
  let component: InformationCenterModalComponent;
  let fixture: ComponentFixture<InformationCenterModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InformationCenterModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InformationCenterModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
