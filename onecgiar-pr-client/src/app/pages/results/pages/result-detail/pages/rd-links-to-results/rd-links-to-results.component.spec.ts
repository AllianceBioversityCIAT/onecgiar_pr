import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdLinksToResultsComponent } from './rd-links-to-results.component';

describe('RdLinksToResultsComponent', () => {
  let component: RdLinksToResultsComponent;
  let fixture: ComponentFixture<RdLinksToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RdLinksToResultsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RdLinksToResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
