import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { MegatrendsComponent } from './megatrends.component';

describe('MegatrendsComponent', () => {
  let component: MegatrendsComponent;
  let fixture: ComponentFixture<MegatrendsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MegatrendsComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MegatrendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have default values on initialization', () => {
    expect(component.body).toEqual(new InnovationDevInfoBody());
    expect(component.options).toBeUndefined();
    expect(component.example2).toBeNull();
  });
});
