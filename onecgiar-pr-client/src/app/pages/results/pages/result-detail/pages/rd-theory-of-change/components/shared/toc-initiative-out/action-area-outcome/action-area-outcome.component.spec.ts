import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionAreaOutcomeComponent } from './action-area-outcome.component';

describe('ActionAreaOutcomeComponent', () => {
  let component: ActionAreaOutcomeComponent;
  let fixture: ComponentFixture<ActionAreaOutcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActionAreaOutcomeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionAreaOutcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
