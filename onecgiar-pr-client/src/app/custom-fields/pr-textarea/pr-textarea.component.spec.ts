import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrTextareaComponent } from './pr-textarea.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrTextareaComponent', () => {
  let component: PrTextareaComponent;
  let fixture: ComponentFixture<PrTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrTextareaComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
