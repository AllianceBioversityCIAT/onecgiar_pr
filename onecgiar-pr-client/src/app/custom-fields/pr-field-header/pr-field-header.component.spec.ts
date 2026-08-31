import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PrFieldHeaderComponent } from './pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrTooltipDirective } from '../../shared/directives/pr-tooltip.directive';
import { PrInfoIconComponent } from '../pr-info-icon/pr-info-icon.component';

describe('PrFieldHeaderComponent', () => {
  let component: PrFieldHeaderComponent;
  let fixture: ComponentFixture<PrFieldHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrFieldHeaderComponent, PrTooltipDirective],
      imports: [HttpClientTestingModule, PrInfoIconComponent]
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

  // P2-3323 — REGRESSION LOCK. The five .sgi-dac-info triggers must behave identically: a click
  // PINS the guidance open. Before this, pr-field-header was the only one that hid it on click,
  // which made the links inside unreachable and, on a phone, opened and closed it in one tap.
  // Assert the directive instance, not the markup: a template rewrite that drops the binding
  // must fail here.
  describe('info tooltip (P2-3323)', () => {
    it('pins the guidance open on click, like every other .sgi-dac-info trigger', () => {
      component.label = 'Innovation reference materials';
      component.tooltip = 'Guidance text with a link';
      fixture.detectChanges();

      const trigger = fixture.debugElement.query(By.css('button.sgi-dac-info'));
      expect(trigger).toBeTruthy();
      expect(trigger.injector.get(PrTooltipDirective).prTooltipPinnable).toBe(true);
    });

    it('renders no trigger at all when there is no guidance to show', () => {
      component.label = 'Plain label';
      component.tooltip = '';
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('button.sgi-dac-info'))).toBeNull();
    });
  });
});
