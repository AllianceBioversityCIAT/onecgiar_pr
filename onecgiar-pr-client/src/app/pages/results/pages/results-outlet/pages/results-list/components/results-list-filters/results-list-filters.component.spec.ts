import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsListFiltersComponent } from './results-list-filters.component';

describe('ResultsListFiltersComponent', () => {
  let component: ResultsListFiltersComponent;
  let fixture: ComponentFixture<ResultsListFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsListFiltersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
