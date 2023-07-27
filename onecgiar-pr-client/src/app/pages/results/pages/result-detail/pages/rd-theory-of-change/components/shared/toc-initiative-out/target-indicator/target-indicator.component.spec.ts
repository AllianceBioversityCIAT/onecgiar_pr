import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetIndicatorComponent } from './target-indicator.component';

describe('TargetIndicatorComponent', () => {
  let component: TargetIndicatorComponent;
  let fixture: ComponentFixture<TargetIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TargetIndicatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TargetIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
