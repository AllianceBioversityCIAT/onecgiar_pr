import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrTextareaComponent } from './pr-textarea.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PrTextareaComponent', () => {
  let component: PrTextareaComponent;
  let fixture: ComponentFixture<PrTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrTextareaComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
