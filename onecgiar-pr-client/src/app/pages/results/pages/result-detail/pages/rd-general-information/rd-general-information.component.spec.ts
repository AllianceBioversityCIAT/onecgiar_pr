import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdGeneralInformationComponent } from './rd-general-information.component';

describe('RdGeneralInformationComponent', () => {
  let component: RdGeneralInformationComponent;
  let fixture: ComponentFixture<RdGeneralInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdGeneralInformationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
