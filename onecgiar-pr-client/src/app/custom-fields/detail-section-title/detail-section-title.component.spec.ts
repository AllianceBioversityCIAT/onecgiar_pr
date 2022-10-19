import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailSectionTitleComponent } from './detail-section-title.component';

describe('DetailSectionTitleComponent', () => {
  let component: DetailSectionTitleComponent;
  let fixture: ComponentFixture<DetailSectionTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DetailSectionTitleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailSectionTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
