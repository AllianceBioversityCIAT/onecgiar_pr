import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrGeoscopeCreatorComponent } from './ipsr-geoscope-creator.component';

describe('IpsrGeoscopeCreatorComponent', () => {
  let component: IpsrGeoscopeCreatorComponent;
  let fixture: ComponentFixture<IpsrGeoscopeCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrGeoscopeCreatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrGeoscopeCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
