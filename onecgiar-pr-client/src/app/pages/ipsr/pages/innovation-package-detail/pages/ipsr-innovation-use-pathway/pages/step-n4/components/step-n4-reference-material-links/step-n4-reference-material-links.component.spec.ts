import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4ReferenceMaterialLinksComponent } from './step-n4-reference-material-links.component';

describe('StepN4ReferenceMaterialLinksComponent', () => {
  let component: StepN4ReferenceMaterialLinksComponent;
  let fixture: ComponentFixture<StepN4ReferenceMaterialLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StepN4ReferenceMaterialLinksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepN4ReferenceMaterialLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
