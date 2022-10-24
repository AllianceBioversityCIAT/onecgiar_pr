import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrTextareaComponent } from './pr-textarea.component';

describe('PrTextareaComponent', () => {
  let component: PrTextareaComponent;
  let fixture: ComponentFixture<PrTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrTextareaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
