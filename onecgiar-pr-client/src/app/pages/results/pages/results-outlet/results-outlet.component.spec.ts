import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsOutletComponent } from './results-outlet.component';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

jest.useFakeTimers();

describe('ResultsOutletComponent', () => {
  let component: ResultsOutletComponent;
  let fixture: ComponentFixture<ResultsOutletComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsOutletComponent],
      imports: [RouterTestingModule, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsOutletComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    jest.runAllTimers();
    expect(component.animateBell).toBeFalsy();
  });
});
