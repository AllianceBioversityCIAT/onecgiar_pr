import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrListFiltersComponent } from './ipsr-list-filters.component';

describe('IpsrListFiltersComponent', () => {
  let component: IpsrListFiltersComponent;
  let fixture: ComponentFixture<IpsrListFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrListFiltersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrListFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
