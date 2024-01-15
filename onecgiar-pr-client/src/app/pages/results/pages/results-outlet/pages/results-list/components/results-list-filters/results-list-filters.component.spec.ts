import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsListFiltersComponent } from './results-list-filters.component';
import { FormsModule } from '@angular/forms';

describe('ResultsListFiltersComponent', () => {
  let component: ResultsListFiltersComponent;
  let fixture: ComponentFixture<ResultsListFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsListFiltersComponent],
      imports: [
        FormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
