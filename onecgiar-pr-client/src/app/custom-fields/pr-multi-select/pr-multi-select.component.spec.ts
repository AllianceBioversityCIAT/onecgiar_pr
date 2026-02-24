import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrMultiSelectComponent } from './pr-multi-select.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PrMultiSelectComponent', () => {
  let component: PrMultiSelectComponent;
  let fixture: ComponentFixture<PrMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrMultiSelectComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
