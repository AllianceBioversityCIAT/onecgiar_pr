import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrLinkToResultsComponent } from './ipsr-link-to-results.component';

describe('IpsrLinkToResultsComponent', () => {
  let component: IpsrLinkToResultsComponent;
  let fixture: ComponentFixture<IpsrLinkToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrLinkToResultsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrLinkToResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
