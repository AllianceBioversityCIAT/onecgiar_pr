import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocInitiativeOutComponent } from './toc-initiative-out.component';

describe('TocInitiativeOutComponent', () => {
  let component: TocInitiativeOutComponent;
  let fixture: ComponentFixture<TocInitiativeOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TocInitiativeOutComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocInitiativeOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
