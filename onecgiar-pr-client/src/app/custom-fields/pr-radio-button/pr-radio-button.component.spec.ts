import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrRadioButtonComponent } from './pr-radio-button.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RadioButtonComponent', () => {
  let component: PrRadioButtonComponent;
  let fixture: ComponentFixture<PrRadioButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrRadioButtonComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrRadioButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
