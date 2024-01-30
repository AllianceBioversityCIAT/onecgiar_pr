import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsOutletComponent } from './results-outlet.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

jest.useFakeTimers();

describe('ResultsOutletComponent', () => {
  let component: ResultsOutletComponent;
  let fixture: ComponentFixture<ResultsOutletComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsOutletComponent],
      imports: [
        RouterTestingModule,
        HttpClientTestingModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsOutletComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    jest.runAllTimers();
    expect(component.animateBell).toBeFalsy();
  });
});
