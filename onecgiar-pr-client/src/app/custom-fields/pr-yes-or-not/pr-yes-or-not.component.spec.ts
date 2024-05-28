import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrYesOrNotComponent } from './pr-yes-or-not.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrYesOrNotComponent', () => {
  let component: PrYesOrNotComponent;
  let fixture: ComponentFixture<PrYesOrNotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrYesOrNotComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrYesOrNotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
