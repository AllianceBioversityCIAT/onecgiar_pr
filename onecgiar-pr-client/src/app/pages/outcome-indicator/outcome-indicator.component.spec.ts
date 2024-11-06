import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OutcomeIndicatorComponent } from './outcome-indicator.component';
import { RouterTestingModule } from '@angular/router/testing';

describe('OutcomeIndicatorComponent', () => {
  let component: OutcomeIndicatorComponent;
  let fixture: ComponentFixture<OutcomeIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OutcomeIndicatorComponent],
      imports: [RouterTestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OutcomeIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
