import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorKrsOthersPrimaryImpactAreaComponent } from './tor-krs-others-primary-impact-area.component';

describe('TorKrsOthersPrimaryImpactAreaComponent', () => {
  let component: TorKrsOthersPrimaryImpactAreaComponent;
  let fixture: ComponentFixture<TorKrsOthersPrimaryImpactAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TorKrsOthersPrimaryImpactAreaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TorKrsOthersPrimaryImpactAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
