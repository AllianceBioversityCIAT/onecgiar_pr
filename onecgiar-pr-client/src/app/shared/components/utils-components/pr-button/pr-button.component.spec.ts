import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrButtonComponent } from './pr-button.component';

describe('PrButtonComponent', () => {
  let component: PrButtonComponent;
  let fixture: ComponentFixture<PrButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
