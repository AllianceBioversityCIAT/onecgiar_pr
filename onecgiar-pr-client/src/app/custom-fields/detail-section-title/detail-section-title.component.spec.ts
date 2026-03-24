import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailSectionTitleComponent } from './detail-section-title.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('DetailSectionTitleComponent', () => {
  let component: DetailSectionTitleComponent;
  let fixture: ComponentFixture<DetailSectionTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DetailSectionTitleComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(DetailSectionTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
