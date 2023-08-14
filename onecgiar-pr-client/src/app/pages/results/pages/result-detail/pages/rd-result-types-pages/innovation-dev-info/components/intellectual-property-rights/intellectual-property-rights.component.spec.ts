import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntellectualPropertyRightsComponent } from './intellectual-property-rights.component';

describe('IntellectualPropertyRightsComponent', () => {
  let component: IntellectualPropertyRightsComponent;
  let fixture: ComponentFixture<IntellectualPropertyRightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IntellectualPropertyRightsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntellectualPropertyRightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
