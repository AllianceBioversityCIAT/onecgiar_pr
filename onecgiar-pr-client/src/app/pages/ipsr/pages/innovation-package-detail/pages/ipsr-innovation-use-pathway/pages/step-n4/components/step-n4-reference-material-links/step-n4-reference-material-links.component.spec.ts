import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4ReferenceMaterialLinksComponent } from './step-n4-reference-material-links.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('StepN4ReferenceMaterialLinksComponent', () => {
  let component: StepN4ReferenceMaterialLinksComponent;
  let fixture: ComponentFixture<StepN4ReferenceMaterialLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4ReferenceMaterialLinksComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4ReferenceMaterialLinksComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
