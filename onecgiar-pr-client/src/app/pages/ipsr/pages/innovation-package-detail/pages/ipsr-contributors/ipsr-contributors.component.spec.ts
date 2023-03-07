import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrContributorsComponent } from './ipsr-contributors.component';

describe('IpsrContributorsComponent', () => {
  let component: IpsrContributorsComponent;
  let fixture: ComponentFixture<IpsrContributorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrContributorsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
