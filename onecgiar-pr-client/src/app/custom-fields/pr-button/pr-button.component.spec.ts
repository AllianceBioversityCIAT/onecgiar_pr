import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from './pr-button.component';

describe('PrButtonComponent', () => {
  let component: PrButtonComponent;
  let fixture: ComponentFixture<PrButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrButtonComponent],
      imports: []
    }).compileComponents();

    fixture = TestBed.createComponent(PrButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit click event when not disabled', () => {
    component.disabled = false;
    const emitSpy = jest.spyOn(component.clickEvent, 'emit');
    component.onClick();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should not emit click event when disabled', () => {
    component.disabled = true;
    const emitSpy = jest.spyOn(component.clickEvent, 'emit');
    component.onClick();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should generate the correct color for the primary color type', () => {
    component.colorType = 'primary';
    expect(component.generateColor()).toBe('var(--pr-color-primary-300)');
  });

  it('should generate the correct color for the danger color type', () => {
    component.colorType = 'danger';
    expect(component.generateColor()).toBe('var(--pr-color-red-300)');
  });

  it('should generate the correct color for the secondary color type', () => {
    component.colorType = 'secondary';
    expect(component.generateColor()).toBe('var(--pr-color-secondary-400)');
  });

  it('should generate the correct color for the success color type', () => {
    component.colorType = 'success';
    expect(component.generateColor()).toBe('var(--pr-color-green-500)');
  });

  describe('loading (request in flight)', () => {
    it('should swallow clicks while loading, even though [disabled] is false', () => {
      component.disabled = false;
      component.loading = true;
      const emitSpy = jest.spyOn(component.clickEvent, 'emit');

      component.onClick();
      component.onClick();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit again once loading clears (a failed save must not leave a dead button)', () => {
      component.loading = true;
      const emitSpy = jest.spyOn(component.clickEvent, 'emit');
      component.onClick();
      expect(emitSpy).not.toHaveBeenCalled();

      component.loading = false;
      component.onClick();

      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should swap label and icon while loading and restore them afterwards', () => {
      component.text = 'Save';
      component.icon = 'save';
      component.loadingText = 'Saving';

      component.loading = true;
      expect(component.currentText).toBe('Saving');
      expect(component.currentIcon).toBe('loop');
      expect(component.spinning).toBe(true);
      expect(component.blocked).toBe(true);
      expect(component.blockedByLoading).toBe(true);

      component.loading = false;
      expect(component.currentText).toBe('Save');
      expect(component.currentIcon).toBe('save');
      expect(component.spinning).toBe(false);
      expect(component.blocked).toBe(false);
      expect(component.blockedByLoading).toBe(false);
    });

    it('should keep the consumer label when no loadingText is supplied', () => {
      component.text = 'Create and continue';
      component.loadingText = '';
      component.loading = true;

      expect(component.currentText).toBe('Create and continue');
    });

    it('should keep [rotating] decorative — it spins but does not block the click', () => {
      component.rotating = true;
      component.disabled = false;
      component.loading = false;
      const emitSpy = jest.spyOn(component.clickEvent, 'emit');

      component.onClick();

      expect(component.spinning).toBe(true);
      expect(component.blocked).toBe(false);
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    it('should resolve the png icon against the icon currently shown', () => {
      component.icon = 'excel_white';
      expect(component.use_png_icon).toBe(true);

      component.loading = true;
      expect(component.use_png_icon).toBe(false);
    });
  });

  it('should have default variant as outlined', () => {
    expect(component.variant).toBe('outlined');
  });

  it('should accept filled variant', () => {
    component.variant = 'filled';
    expect(component.variant).toBe('filled');
  });

  it('should accept outlined variant', () => {
    component.variant = 'outlined';
    expect(component.variant).toBe('outlined');
  });
});

/**
 * Host-level regression: 15+ call sites already carry `[ngClass]="{ globalDisabled: … }"` on
 * <app-pr-button>. NgClass writes classes imperatively, so a class-based host block would be wiped
 * the moment that expression flips true→false — and Angular would not re-apply it, since the host
 * value itself never changed. The block must therefore survive an unrelated ngClass churn.
 */
@Component({
  standalone: false,
  selector: 'app-pr-button-host-spec',
  template: `<app-pr-button [loading]="loading" [ngClass]="{ globalDisabled: disabled }" text="Save" icon="save"></app-pr-button>`
})
class PrButtonHostComponent {
  loading = false;
  disabled = false;
}

describe('PrButtonComponent — host pointer block under a consumer ngClass', () => {
  let fixture: ComponentFixture<PrButtonHostComponent>;
  let hostElement: HTMLElement;

  const render = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges(false);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrButtonComponent, PrButtonHostComponent],
      imports: [CommonModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrButtonHostComponent);
    render();
    hostElement = fixture.nativeElement.querySelector('app-pr-button');
  });

  it('should not block pointer events while idle', () => {
    expect(hostElement.style.pointerEvents).toBe('');
  });

  it('should block pointer events on the host while loading', () => {
    fixture.componentInstance.loading = true;
    render();

    expect(hostElement.style.pointerEvents).toBe('none');
  });

  it('should keep the host blocked when the consumer ngClass drops globalDisabled mid-flight', () => {
    fixture.componentInstance.loading = true;
    fixture.componentInstance.disabled = true;
    render();
    expect(hostElement.classList.contains('globalDisabled')).toBe(true);

    fixture.componentInstance.disabled = false;
    render();

    expect(hostElement.classList.contains('globalDisabled')).toBe(false);
    expect(hostElement.style.pointerEvents).toBe('none');
  });

  it('should release the host once loading clears', () => {
    fixture.componentInstance.loading = true;
    render();
    fixture.componentInstance.loading = false;
    render();

    expect(hostElement.style.pointerEvents).toBe('');
  });
});
