import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AowTargetDetailsDrawerComponent } from './aow-target-details-drawer.component';

describe('AowTargetDetailsDrawerComponent', () => {
  let component: AowTargetDetailsDrawerComponent;
  let fixture: ComponentFixture<AowTargetDetailsDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AowTargetDetailsDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AowTargetDetailsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
