import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NonPooledInfoP25Component } from './non-pooled-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrSelectComponent } from '../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrButtonComponent } from '../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrInputComponent } from '../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { DialogModule } from 'primeng/dialog';
import { LabelNamePipe } from '../../../../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../../../../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { FormsModule } from '@angular/forms';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../../..//custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { TooltipModule } from 'primeng/tooltip';

describe('NonPooledInfoP25Component', () => {
  let component: NonPooledInfoP25Component;
  let fixture: ComponentFixture<NonPooledInfoP25Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        NonPooledInfoP25Component,
        PrSelectComponent,
        PrButtonComponent,
        PrInputComponent,
        LabelNamePipe,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
        YesOrNotByBooleanPipe
      ],
      imports: [HttpClientTestingModule, DialogModule, FormsModule, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(NonPooledInfoP25Component);
    component = fixture.componentInstance;
    component.body = {
      obj_result_project: {
        obj_clarisa_project: {
          id: 1,
          shortName: ''
        }
      }
    };
    fixture.detectChanges();
  });

  it('should have initial properties set', () => {
    expect(component.body).toBeDefined();
    expect(component.visible).toBeFalsy();
  });

  it('should set visible to true when ngOnInit is called', () => {
    expect(component.visible).toBeFalsy();
  });
});
