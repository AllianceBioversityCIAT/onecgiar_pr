import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrInputComponent } from './pr-input.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { PrFieldValidationsComponent } from '../pr-field-validations/pr-field-validations.component';
import { YesOrNotByBooleanPipe } from '../pipes/yes-or-not-by-boolean.pipe';

describe('PrInputComponent', () => {
  let component: PrInputComponent;
  let fixture: ComponentFixture<PrInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrInputComponent, PrFieldHeaderComponent, PrFieldValidationsComponent, YesOrNotByBooleanPipe],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps a present value pending when the consumer marks it as invalid', () => {
    component.writeValue('Bilateral Draft #1199');
    fixture.componentRef.setInput('valueValid', false);
    fixture.detectChanges();

    expect(component.hasValue).toBe(false);
  });
});
