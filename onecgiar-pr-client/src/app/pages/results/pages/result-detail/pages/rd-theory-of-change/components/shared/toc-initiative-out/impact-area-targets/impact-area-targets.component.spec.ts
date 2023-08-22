import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImpactAreaTargetsComponent } from './impact-area-targets.component';

describe('ImpactAreaTargetsComponent', () => {
  let component: ImpactAreaTargetsComponent;
  let fixture: ComponentFixture<ImpactAreaTargetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImpactAreaTargetsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImpactAreaTargetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
