import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultsToUpdateModalComponent', () => {
  let component: ResultsToUpdateModalComponent;
  let fixture: ComponentFixture<ResultsToUpdateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsToUpdateModalComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsToUpdateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
