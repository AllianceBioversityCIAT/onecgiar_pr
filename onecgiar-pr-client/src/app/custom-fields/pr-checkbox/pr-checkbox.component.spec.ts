import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrCheckboxComponent } from './pr-checkbox.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrCheckboxComponent', () => {
  let component: PrCheckboxComponent;
  let fixture: ComponentFixture<PrCheckboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrCheckboxComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
