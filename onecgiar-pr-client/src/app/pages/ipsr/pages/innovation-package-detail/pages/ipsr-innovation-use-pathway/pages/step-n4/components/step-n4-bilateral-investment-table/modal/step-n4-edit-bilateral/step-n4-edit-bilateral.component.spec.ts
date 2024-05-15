import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4EditBilateralComponent } from './step-n4-edit-bilateral.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DialogModule } from 'primeng/dialog';
import { PrSelectComponent } from '../../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { LabelNamePipe } from '../../../../../../../../../../../../custom-fields/pr-select/label-name.pipe';

describe('StepN4EditBilateralComponent', () => {
  let component: StepN4EditBilateralComponent;
  let fixture: ComponentFixture<StepN4EditBilateralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4EditBilateralComponent, PrSelectComponent, PrInputComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientTestingModule, DialogModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4EditBilateralComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
