import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrMultiSelectComponent } from './pr-multi-select.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrMultiSelectComponent', () => {
  let component: PrMultiSelectComponent;
  let fixture: ComponentFixture<PrMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
