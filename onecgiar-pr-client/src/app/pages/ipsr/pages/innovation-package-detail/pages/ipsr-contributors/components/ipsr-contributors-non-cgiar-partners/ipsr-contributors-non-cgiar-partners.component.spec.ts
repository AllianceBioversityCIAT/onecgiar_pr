import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrContributorsNonCgiarPartnersComponent } from './ipsr-contributors-non-cgiar-partners.component';

describe('IpsrContributorsNonCgiarPartnersComponent', () => {
  let component: IpsrContributorsNonCgiarPartnersComponent;
  let fixture: ComponentFixture<IpsrContributorsNonCgiarPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrContributorsNonCgiarPartnersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsNonCgiarPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
