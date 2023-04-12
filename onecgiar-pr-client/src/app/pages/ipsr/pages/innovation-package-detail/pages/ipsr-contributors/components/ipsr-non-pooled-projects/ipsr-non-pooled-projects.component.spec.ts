import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrNonPooledProjectsComponent } from './ipsr-non-pooled-projects.component';

describe('IpsrNonPooledProjectsComponent', () => {
  let component: IpsrNonPooledProjectsComponent;
  let fixture: ComponentFixture<IpsrNonPooledProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrNonPooledProjectsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrNonPooledProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
