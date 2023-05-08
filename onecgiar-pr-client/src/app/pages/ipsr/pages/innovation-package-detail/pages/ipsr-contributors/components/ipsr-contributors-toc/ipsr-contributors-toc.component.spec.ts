import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrContributorsTocComponent } from './ipsr-contributors-toc.component';

describe('IpsrContributorsTocComponent', () => {
  let component: IpsrContributorsTocComponent;
  let fixture: ComponentFixture<IpsrContributorsTocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrContributorsTocComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsTocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
