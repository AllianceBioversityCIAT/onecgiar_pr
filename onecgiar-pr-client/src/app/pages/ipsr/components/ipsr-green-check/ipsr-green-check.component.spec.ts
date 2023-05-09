import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrGreenCheckComponent } from './ipsr-green-check.component';

describe('IpsrGreenCheckComponent', () => {
  let component: IpsrGreenCheckComponent;
  let fixture: ComponentFixture<IpsrGreenCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrGreenCheckComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrGreenCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
