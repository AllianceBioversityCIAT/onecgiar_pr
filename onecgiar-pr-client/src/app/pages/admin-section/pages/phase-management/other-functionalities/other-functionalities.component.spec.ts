import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherFunctionalitiesComponent } from './other-functionalities.component';

describe('OtherFunctionalitiesComponent', () => {
  let component: OtherFunctionalitiesComponent;
  let fixture: ComponentFixture<OtherFunctionalitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OtherFunctionalitiesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtherFunctionalitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
