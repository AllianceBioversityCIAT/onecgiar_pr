import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultTitleComponent } from './result-title.component';
import { HttpClientModule } from '@angular/common/http';

describe('ResultTitleComponent', () => {
  let component: ResultTitleComponent;
  let fixture: ComponentFixture<ResultTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultTitleComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
