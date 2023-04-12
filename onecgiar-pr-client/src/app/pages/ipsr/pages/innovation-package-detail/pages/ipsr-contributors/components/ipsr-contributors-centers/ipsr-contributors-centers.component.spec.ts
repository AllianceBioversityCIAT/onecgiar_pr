import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrContributorsCentersComponent } from './ipsr-contributors-centers.component';

describe('IpsrContributorsCentersComponent', () => {
  let component: IpsrContributorsCentersComponent;
  let fixture: ComponentFixture<IpsrContributorsCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrContributorsCentersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
