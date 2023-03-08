import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsInnovationOutputListComponent } from './results-innovation-output-list.component';

describe('ResultsInnovationOutputListComponent', () => {
  let component: ResultsInnovationOutputListComponent;
  let fixture: ComponentFixture<ResultsInnovationOutputListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultsInnovationOutputListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsInnovationOutputListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
