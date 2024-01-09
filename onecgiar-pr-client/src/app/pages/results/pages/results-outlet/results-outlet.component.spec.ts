import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsOutletComponent } from './results-outlet.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

describe('ResultsOutletComponent', () => {
  let component: ResultsOutletComponent;
  let fixture: ComponentFixture<ResultsOutletComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsOutletComponent],
      imports: [
        RouterTestingModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsOutletComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
