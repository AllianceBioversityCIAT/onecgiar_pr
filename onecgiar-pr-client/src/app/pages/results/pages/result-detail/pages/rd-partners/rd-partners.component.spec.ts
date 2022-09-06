import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdPartnersComponent } from './rd-partners.component';

describe('RdPartnersComponent', () => {
  let component: RdPartnersComponent;
  let fixture: ComponentFixture<RdPartnersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdPartnersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdPartnersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
