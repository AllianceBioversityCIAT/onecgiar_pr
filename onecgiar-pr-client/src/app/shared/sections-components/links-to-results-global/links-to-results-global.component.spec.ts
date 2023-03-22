import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinksToResultsGlobalComponent } from './links-to-results-global.component';

describe('LinksToResultsGlobalComponent', () => {
  let component: LinksToResultsGlobalComponent;
  let fixture: ComponentFixture<LinksToResultsGlobalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LinksToResultsGlobalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinksToResultsGlobalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
