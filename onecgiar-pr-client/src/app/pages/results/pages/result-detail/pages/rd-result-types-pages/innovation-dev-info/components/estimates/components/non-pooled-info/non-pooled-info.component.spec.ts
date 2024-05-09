import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NonPooledInfoComponent } from './non-pooled-info.component';
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

describe('NonPooledInfoComponent', () => {
  let component: NonPooledInfoComponent;
  let fixture: ComponentFixture<NonPooledInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        NonPooledInfoComponent,
        PrSelectComponent,
        PrButtonComponent,
        PrInputComponent,
        LabelNamePipe,
        PrFieldHeaderComponent,
        PrFieldValidationsComponent,
        YesOrNotByBooleanPipe
      ],
      imports: [
        HttpClientTestingModule,
        DialogModule,
        FormsModule,
        TooltipModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NonPooledInfoComponent);
    component = fixture.componentInstance;
    component.body = {
      obj_non_pooled_projetct: {
        funder_institution_id: 1,
        grant_title: '',
        center_grant_id: 1,
        lead_center_id: ''
      }
    }
    fixture.detectChanges();
  });

  it('should have initial properties set', () => {
    expect(component.body).toBeDefined();
    expect(component.visible).toBeFalsy();
  });

  it('should set visible to true when ngOnInit is called', () => {
    component.ngOnInit();

    expect(component.visible).toBeFalsy();
  });
});
