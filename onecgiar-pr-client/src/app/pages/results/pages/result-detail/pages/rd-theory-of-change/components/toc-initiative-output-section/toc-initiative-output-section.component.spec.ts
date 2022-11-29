import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocInitiativeOutputSectionComponent } from './toc-initiative-output-section.component';

describe('TocInitiativeOutputSectionComponent', () => {
  let component: TocInitiativeOutputSectionComponent;
  let fixture: ComponentFixture<TocInitiativeOutputSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TocInitiativeOutputSectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocInitiativeOutputSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
