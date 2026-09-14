import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { FieldGroupHeaderComponent } from './field-group-header.component';
import { PrInfoIconComponent } from '../pr-info-icon/pr-info-icon.component';
import { PrTooltipDirectiveModule } from '../../shared/directives/pr-tooltip-directive.module';

@Component({
  standalone: false,
  template: `<app-field-group-header
    [label]="label()"
    [tooltip]="tooltip()"
    [completed]="completed()"
    [total]="total()"
    [unit]="unit()"></app-field-group-header>`
})
class HostComponent {
  // Signals, no propiedades planas: bajo zoneless una escritura plana no notifica al ciclo y el
  // segundo pase de verificación de TestBed la denuncia como NG0100. Es el mismo patrón que
  // `field-card.component.spec.ts`.
  label = signal('Impact Area scores');
  tooltip = signal('');
  completed = signal<number | null>(0);
  total = signal(5);
  unit = signal('scored');
}

describe('FieldGroupHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (css: string) => fixture.debugElement.query(By.css(css));
  const band = () => q('.fgh').nativeElement as HTMLElement;
  const cmp = () => fixture.debugElement.query(By.directive(FieldGroupHeaderComponent)).componentInstance as FieldGroupHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FieldGroupHeaderComponent, HostComponent],
      imports: [PrTooltipDirectiveModule, PrInfoIconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the label with the colon the platform uses on group titles', () => {
    expect(q('.fgh_title').nativeElement.textContent.trim()).toBe('Impact Area scores:');
  });

  describe('progress', () => {
    it('reads amber while the group is incomplete, and states the count', () => {
      expect(band().getAttribute('data-state')).toBe('todo');
      expect(q('.fgh_count').nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe('0 of 5 scored');
    });

    it('turns green only when every item is resolved', () => {
      host.completed.set(4);
      fixture.detectChanges();
      expect(band().getAttribute('data-state')).toBe('todo');

      host.completed.set(5);
      fixture.detectChanges();
      expect(band().getAttribute('data-state')).toBe('ok');
    });

    /**
     * 🛑 El caso que motiva el `null`: un grupo sin contador NO puede pintarse verde. Con un
     * `completed = 0 / total = 0` la comparación `0 >= 0` diría "completo" sobre un grupo vacío.
     */
    it('stays neutral and hides the ring when the group carries no counter', () => {
      host.completed.set(null);
      fixture.detectChanges();
      expect(band().getAttribute('data-state')).toBe('plain');
      expect(q('.fgh_progress')).toBeNull();

      host.completed.set(0);
      host.total.set(0);
      fixture.detectChanges();
      expect(band().getAttribute('data-state')).toBe('plain');
      expect(q('.fgh_progress')).toBeNull();
    });

    it('draws the arc in proportion, and fills it completely at 100%', () => {
      const full = cmp().circumference;

      host.completed.set(0);
      fixture.detectChanges();
      // Vacío: el trazo está desplazado una vuelta entera, o sea no se ve nada de arco.
      expect(cmp().dashOffset).toBeCloseTo(full, 5);

      host.completed.set(2);
      fixture.detectChanges();
      expect(cmp().dashOffset).toBeCloseTo(full * 0.6, 5);

      host.completed.set(5);
      fixture.detectChanges();
      expect(cmp().dashOffset).toBeCloseTo(0, 5);
    });

    it('never draws past a full turn when completed overshoots total', () => {
      host.completed.set(9);
      fixture.detectChanges();
      expect(cmp().ratio).toBe(1);
      expect(cmp().dashOffset).toBeCloseTo(0, 5);
    });
  });

  it('renders the info trigger only when a tooltip is supplied', () => {
    expect(q('.sgi-dac-info')).toBeNull();

    host.tooltip.set('Score each Impact Area from 0 to 2.');
    fixture.detectChanges();
    expect(q('.sgi-dac-info')).toBeTruthy();
  });
});
