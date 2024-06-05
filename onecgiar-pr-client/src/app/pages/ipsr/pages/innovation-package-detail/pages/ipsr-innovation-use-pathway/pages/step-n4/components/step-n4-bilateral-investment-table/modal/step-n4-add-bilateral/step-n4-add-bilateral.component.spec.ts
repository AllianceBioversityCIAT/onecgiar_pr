import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddBilateralComponent } from './step-n4-add-bilateral.component';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('StepN4AddBilateralComponent', () => {
  let component: StepN4AddBilateralComponent;
  let fixture: ComponentFixture<StepN4AddBilateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4AddBilateralComponent, PrButtonComponent],
      imports: [HttpClientTestingModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddBilateralComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
