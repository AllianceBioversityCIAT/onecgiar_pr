import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocImpactSectionComponent } from './toc-impact-section.component';

describe('TocImpactSectionComponent', () => {
  let component: TocImpactSectionComponent;
  let fixture: ComponentFixture<TocImpactSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TocImpactSectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocImpactSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
