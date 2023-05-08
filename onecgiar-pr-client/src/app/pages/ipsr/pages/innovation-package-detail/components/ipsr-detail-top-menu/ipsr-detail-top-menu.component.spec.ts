import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrDetailTopMenuComponent } from './ipsr-detail-top-menu.component';

describe('IpsrDetailTopMenuComponent', () => {
  let component: IpsrDetailTopMenuComponent;
  let fixture: ComponentFixture<IpsrDetailTopMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsrDetailTopMenuComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrDetailTopMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
