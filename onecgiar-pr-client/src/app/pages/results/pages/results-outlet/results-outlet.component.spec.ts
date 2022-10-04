import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsOutletComponent } from './results-outlet.component';

describe('ResultsOutletComponent', () => {
  let component: ResultsOutletComponent;
  let fixture: ComponentFixture<ResultsOutletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultsOutletComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsOutletComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
