import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdGeographicLocationComponent } from './rd-geographic-location.component';

describe('RdGeographicLocationComponent', () => {
  let component: RdGeographicLocationComponent;
  let fixture: ComponentFixture<RdGeographicLocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdGeographicLocationComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdGeographicLocationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
