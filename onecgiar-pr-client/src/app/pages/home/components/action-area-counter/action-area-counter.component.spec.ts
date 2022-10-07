import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionAreaCounterComponent } from './action-area-counter.component';

describe('ActionAreaCounterComponent', () => {
  let component: ActionAreaCounterComponent;
  let fixture: ComponentFixture<ActionAreaCounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ActionAreaCounterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionAreaCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
