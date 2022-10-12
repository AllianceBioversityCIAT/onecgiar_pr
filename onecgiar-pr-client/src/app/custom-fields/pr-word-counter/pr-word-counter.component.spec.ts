import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrWordCounterComponent } from './pr-word-counter.component';

describe('PrWordCounterComponent', () => {
  let component: PrWordCounterComponent;
  let fixture: ComponentFixture<PrWordCounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PrWordCounterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrWordCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
