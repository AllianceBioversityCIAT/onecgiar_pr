import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrRangeLevelComponent } from './pr-range-level.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RolesService } from '../../shared/services/global/roles.service';

describe('PrRangeLevelComponent', () => {
  let component: PrRangeLevelComponent;
  let fixture: ComponentFixture<PrRangeLevelComponent>;
  let rolesService: { readOnly: boolean };

  beforeEach(async () => {
    rolesService = { readOnly: false };

    await TestBed.configureTestingModule({
      declarations: [PrRangeLevelComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: RolesService, useValue: rolesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(PrRangeLevelComponent);
    component = fixture.componentInstance;
    component.options = [
      { id: 10, name: 'Level 0', definition: 'Basic principles.' },
      { id: 11, name: 'Level 1', definition: 'A longer narrative about basic research and impact pathways for partners.' },
      { id: 12, name: 'Level 2', definition: 'Short.' }
    ];
    component.optionValue = 'id';
    component.itemTitle = 'name';
    component.itemDescription = 'definition';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onSelectLevel updates value and emits', () => {
    const emitSpy = jest.spyOn(component.selectOptionEvent, 'emit');
    component.onSelectLevel(11);

    expect(component.value).toBe(11);
    expect(component.selectedIndex).toBe(1);
    expect(component.selectedTitle).toBe('Level 1');
    expect(emitSpy).toHaveBeenCalledWith(11);
  });

  it('progressPercent reflects selected index across the track', () => {
    component.onSelectLevel(10);
    expect(component.progressPercent).toBe(0);

    component.onSelectLevel(12);
    expect(component.progressPercent).toBe(100);

    component.onSelectLevel(11);
    expect(component.progressPercent).toBe(50);
  });

  it('does not select when disabled or read-only', () => {
    component.value = 10;

    component.disabled = true;
    component.onSelectLevel(11);
    expect(component.value).toBe(10);

    component.disabled = false;
    rolesService.readOnly = true;
    component.onSelectLevel(11);
    expect(component.value).toBe(10);
  });

  it('narrative always reflects selected level (no hover preview swap)', () => {
    component.onSelectLevel(10);
    expect(component.selectedTitle).toBe('Level 0');
    expect(component.selectedDescription).toBe('Basic principles.');

    component.onSelectLevel(11);
    expect(component.selectedTitle).toBe('Level 1');
    expect(component.selectedDescription).toContain('longer narrative');
  });

  /**
   * P2-3655 — the ladder had no validation affordance at all, so an unanswered MANDATORY level
   * rendered pixel-identical to an answered one and the reporter could not find the field the
   * bottom bar was counting. The marker is opt-in (`[required]`, default `false`) precisely so the
   * callers that never asked for it — the four IPSR ladders in `step-n3`, plus bilateral and
   * innovation-dev — keep rendering exactly what they rendered before.
   */
  describe('requiredness marker (P2-3655)', () => {
    const marker = () => fixture.nativeElement.querySelector('.prl-required');
    const track = () => fixture.nativeElement.querySelector('.prl-track');
    /**
     * Writing a field on the instance does not mark the view dirty, and `detectChanges()` only
     * refreshes dirty views before running its check-no-changes pass — so without this the second
     * pass is the first one to see the new value and reports it as NG0100.
     */
    const render = () => {
      fixture.changeDetectorRef.markForCheck();
      fixture.detectChanges();
    };

    it('required and empty: the marker is visible', () => {
      component.required = true;
      component.writeValue(null);
      render();

      expect(component.isRequiredAndEmpty).toBe(true);
      expect(marker()).toBeTruthy();
      expect(marker().textContent).toContain('*');
      expect(marker().textContent).toContain('required');
      expect(track().getAttribute('aria-required')).toBe('true');
    });

    /**
     * The marker is PURELY visual. `DataControlService.someMandatoryFieldIncompleteResultDetail`
     * counts `.pr-input.mandatory .input-validation` and `.pr-field.mandatory` (data-control.service.ts:264-280);
     * this field is already counted once by the caller's `appFeedbackValidation` marker
     * (innovation-use-form.component.html:390-392). Emitting any of those classes here would
     * count it twice and turn "1 field missing" into "2".
     */
    it('does not emit any of the classes the mandatory-field scan counts', () => {
      component.required = true;
      component.writeValue(null);
      render();

      const host: HTMLElement = fixture.nativeElement;
      expect(host.querySelectorAll('.pr-field.mandatory')).toHaveLength(0);
      expect(host.querySelectorAll('.pr-input.mandatory')).toHaveLength(0);
      expect(host.querySelectorAll('.mandatory')).toHaveLength(0);
    });

    it('required and answered: the marker is gone', () => {
      component.required = true;
      component.onSelectLevel(11);
      render();

      expect(component.isRequiredAndEmpty).toBe(false);
      expect(marker()).toBeNull();
    });

    it('required and answered with level 0: the marker is gone (0 is a real level, not "empty")', () => {
      component.required = true;
      component.onSelectLevel(0);
      render();

      expect(component.isRequiredAndEmpty).toBe(false);
      expect(marker()).toBeNull();
    });

    it('required and empty but not operable: no marker, because the dots cannot be clicked', () => {
      component.required = true;
      component.writeValue(null);

      component.disabled = true;
      render();
      expect(marker()).toBeNull();

      component.disabled = false;
      rolesService.readOnly = true;
      render();
      expect(marker()).toBeNull();
    });

    // ── Control case: this is what protects IPSR, bilateral and innovation-dev ──────────────
    it('WITHOUT [required] the marker never renders, empty or answered, and no aria-required leaks', () => {
      expect(component.required).toBe(false);

      component.writeValue(null);
      render();
      expect(component.isRequiredAndEmpty).toBe(false);
      expect(marker()).toBeNull();
      expect(track().hasAttribute('aria-required')).toBe(false);

      component.onSelectLevel(11);
      render();
      expect(marker()).toBeNull();
      expect(track().hasAttribute('aria-required')).toBe(false);
    });
  });
});
