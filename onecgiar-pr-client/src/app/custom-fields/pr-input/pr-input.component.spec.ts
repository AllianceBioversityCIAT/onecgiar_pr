import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrInputComponent } from './pr-input.component';

describe('PrInputComponent', () => {
  let component: PrInputComponent;
  let fixture: ComponentFixture<PrInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrInputComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
