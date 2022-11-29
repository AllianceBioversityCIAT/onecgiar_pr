import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultLevelButtonsComponent } from './result-level-buttons.component';

describe('ResultLevelButtonsComponent', () => {
  let component: ResultLevelButtonsComponent;
  let fixture: ComponentFixture<ResultLevelButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultLevelButtonsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultLevelButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
