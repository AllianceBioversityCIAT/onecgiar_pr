import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocInitiativeOutcomeSectionComponent } from './toc-initiative-outcome-section.component';

describe('TocInitiativeOutcomeSectionComponent', () => {
  let component: TocInitiativeOutcomeSectionComponent;
  let fixture: ComponentFixture<TocInitiativeOutcomeSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TocInitiativeOutcomeSectionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TocInitiativeOutcomeSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
