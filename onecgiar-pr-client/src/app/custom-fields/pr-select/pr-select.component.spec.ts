import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrSelectComponent } from './pr-select.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrSelectComponent', () => {
  let component: PrSelectComponent;
  let fixture: ComponentFixture<PrSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrSelectComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
