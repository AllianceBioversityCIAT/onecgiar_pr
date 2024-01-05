import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrRangeLevelComponent } from './pr-range-level.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PrRangeLevelComponent', () => {
  let component: PrRangeLevelComponent;
  let fixture: ComponentFixture<PrRangeLevelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrRangeLevelComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrRangeLevelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
