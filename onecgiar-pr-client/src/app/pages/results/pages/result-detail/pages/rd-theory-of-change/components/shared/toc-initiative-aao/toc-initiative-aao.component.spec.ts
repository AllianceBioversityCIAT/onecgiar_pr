import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TocInitiativeAaoComponent } from './toc-initiative-aao.component';

describe('TocInitiativeAaoComponent', () => {
  let component: TocInitiativeAaoComponent;
  let fixture: ComponentFixture<TocInitiativeAaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TocInitiativeAaoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TocInitiativeAaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
