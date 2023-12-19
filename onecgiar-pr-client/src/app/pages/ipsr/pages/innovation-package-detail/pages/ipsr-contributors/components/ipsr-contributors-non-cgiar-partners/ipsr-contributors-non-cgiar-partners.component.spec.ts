import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrContributorsNonCgiarPartnersComponent } from './ipsr-contributors-non-cgiar-partners.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('IpsrContributorsNonCgiarPartnersComponent', () => {
  let component: IpsrContributorsNonCgiarPartnersComponent;
  let fixture: ComponentFixture<IpsrContributorsNonCgiarPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrContributorsNonCgiarPartnersComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsNonCgiarPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
