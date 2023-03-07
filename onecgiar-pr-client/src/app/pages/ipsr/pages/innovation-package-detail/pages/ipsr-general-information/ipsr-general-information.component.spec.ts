import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrGeneralInformationComponent } from './ipsr-general-information.component';

describe('IpsrGeneralInformationComponent', () => {
  let component: IpsrGeneralInformationComponent;
  let fixture: ComponentFixture<IpsrGeneralInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrGeneralInformationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrGeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
