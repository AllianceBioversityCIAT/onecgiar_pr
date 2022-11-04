import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocActionAreaOutcomeSectionComponent } from './toc-action-area-outcome-section.component';

describe('TocActionAreaOutcomeSectionComponent', () => {
  let component: TocActionAreaOutcomeSectionComponent;
  let fixture: ComponentFixture<TocActionAreaOutcomeSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TocActionAreaOutcomeSectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocActionAreaOutcomeSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
