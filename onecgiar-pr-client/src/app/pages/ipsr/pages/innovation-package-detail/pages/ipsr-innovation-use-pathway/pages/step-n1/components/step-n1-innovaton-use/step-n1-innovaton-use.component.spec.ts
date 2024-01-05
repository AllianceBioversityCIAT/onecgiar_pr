import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN1InnovatonUseComponent } from './step-n1-innovaton-use.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN1InnovatonUseComponent', () => {
  let component: StepN1InnovatonUseComponent;
  let fixture: ComponentFixture<StepN1InnovatonUseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1InnovatonUseComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1InnovatonUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
