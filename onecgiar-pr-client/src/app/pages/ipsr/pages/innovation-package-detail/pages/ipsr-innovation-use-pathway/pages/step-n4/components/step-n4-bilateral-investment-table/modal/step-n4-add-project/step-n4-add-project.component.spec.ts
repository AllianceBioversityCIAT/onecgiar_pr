import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddProjectComponent } from './step-n4-add-project.component';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN4AddProjectComponent', () => {
  let component: StepN4AddProjectComponent;
  let fixture: ComponentFixture<StepN4AddProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4AddProjectComponent, PrButtonComponent],
      imports: [HttpClientTestingModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddProjectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
