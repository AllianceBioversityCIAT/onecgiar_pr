import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrFieldHeaderComponent } from './pr-field-header.component';
import { HttpClientModule } from '@angular/common/http';

describe('PrFieldHeaderComponent', () => {
  let component: PrFieldHeaderComponent;
  let fixture: ComponentFixture<PrFieldHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrFieldHeaderComponent],
      imports: [HttpClientModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrFieldHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values for inputs', () => {
    expect(component.simpleStyle).toBeUndefined();
    expect(component.label).toBeUndefined();
    expect(component.description).toBeUndefined();
    expect(component.required).toBe(true);
    expect(component.readOnly).toBeUndefined();
    expect(component.useColon).toBe(true);
    expect(component.showDescriptionLabel).toBe(true);
    expect(component.descInlineStyles).toBe('');
  });

  it('should return description label when showDescriptionLabel is true and rolesSE.readOnly is false', () => {
    component.showDescriptionLabel = true;
    component.rolesSE.readOnly = false;
    expect(component.descriptionLabel).toBe('<strong class="mr-5 font-weight-600 text-black">Description:</strong>');
  });

  it('should return empty string for description label when showDescriptionLabel is false', () => {
    component.showDescriptionLabel = false;
    expect(component.descriptionLabel).toBe('');
  });

  it('should return empty string for description label when rolesSE.readOnly is true', () => {
    component.showDescriptionLabel = true;
    component.rolesSE.readOnly = true;
    expect(component.descriptionLabel).toBe('');
  });
});
