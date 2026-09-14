import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { FieldCardComponent } from './field-card.component';
import { PrTooltipDirective } from '../../shared/directives/pr-tooltip.directive';
import { PrTooltipDirectiveModule } from '../../shared/directives/pr-tooltip-directive.module';
import { PrInfoIconComponent } from '../pr-info-icon/pr-info-icon.component';

@Component({
  template: `<app-field-card
    [label]="label()"
    [description]="description()"
    [required]="required()"
    [hasValue]="hasValue()"
    [hasError]="hasError()"
    [tooltip]="tooltip()"
    [showHeader]="showHeader()"
    [showDescription]="showDescription()"
    [pinGuidanceByDefault]="pinByDefault()"
    pinKey="my-field">
    <input class="projected-control" />
  </app-field-card>`,
  standalone: false
})
class HostComponent {
  // Signals, not plain fields: Angular 21 renders zoneless, so a plain property mutated from a
  // test would not mark the host view dirty and `detectChanges()` would throw NG0100.
  readonly label = signal('Title of Result');
  readonly description = signal('');
  readonly required = signal(true);
  readonly hasValue = signal(false);
  readonly hasError = signal(false);
  readonly showHeader = signal(true);
  readonly showDescription = signal(true);
  readonly tooltip = signal('');
  readonly pinByDefault = signal(false);
}

describe('FieldCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const q = (selector: string) => fixture.debugElement.query(By.css(selector));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FieldCardComponent, HostComponent],
      imports: [CommonModule, PrTooltipDirectiveModule, PrInfoIconComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** P2-3201: guidance moved out of the inline grey box is only reachable through this trigger. */
  describe('guidance tooltip trigger', () => {
    beforeEach(() => {
      host.tooltip.set('<a href="https://example.org">Glossary</a>');
      fixture.detectChanges();
    });

    afterEach(() => {
      document.body.querySelectorAll('.pr-tooltip').forEach(el => el.remove());
    });

    it('replaces the colour legend with the ⓘ trigger', () => {
      expect(q('.sgi-dac-info')).toBeTruthy();
      expect(q('.fch_info_wrap')).toBeNull();
    });

    // P2-3339: this used to assert the ligature name `info_outline` as the button's text content.
    // That is exactly the failure mode QA reported — when the icon font does not resolve, the
    // ligature name IS what the user sees, painted over the Mandatory badge. The glyph is now an
    // inline SVG, so there is no text content to leak.
    it('draws the glyph as inline SVG, with no ligature text to fall back to', () => {
      const trigger = q('.sgi-dac-info');
      expect(trigger).toBeTruthy();
      expect(trigger.nativeElement.querySelector('svg')).toBeTruthy();
      expect(trigger.nativeElement.textContent.trim()).toBe('');
    });

    // P2-3323 Part 2 (TIP-DD-5): `prTooltipPinnable` was removed — pinning is unconditional
    // directive-wide now. This component's scope is just "clicking the trigger here actually
    // pins it"; the directive's full open/close/keyboard behavior is covered in
    // pr-tooltip.directive.spec.ts.
    it('pins on click so the guidance survives the pointer leaving and its links stay clickable', () => {
      const directive = fixture.debugElement.query(By.directive(PrTooltipDirective)).injector.get(PrTooltipDirective);
      expect(directive).toBeInstanceOf(PrTooltipDirective);

      const trigger = q('.sgi-dac-info');
      trigger.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.body.querySelector('.pr-tooltip.pr-tooltip--pinned')).toBeTruthy();

      trigger.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));
      expect(document.body.querySelector('.pr-tooltip')).toBeTruthy(); // still open — pinning survives pointer leaving
    });

    // The colour legend that used to take this slot explained the four card colours. With no
    // colours left to explain, a field with no guidance now shows no icon at all.
    it('shows no icon at all when no guidance is provided', () => {
      host.tooltip.set('');
      fixture.detectChanges();
      expect(q('.sgi-dac-info')).toBeNull();
      expect(q('.fch_info_wrap')).toBeNull();
    });
  });

  describe('header gating', () => {
    it('renders the header when the field has a label', () => {
      expect(q('.field_card_header')).toBeTruthy();
      expect(q('.fch_title').nativeElement.textContent).toContain('Title of Result');
    });

    /**
     * `app-pr-field-header` — the component this card replaced — gated its whole label block on
     * `*ngIf="this.label"`. Around 60 label-less call sites (currency cells, sub-inputs, "Other"
     * specifiers) rely on that, and most default to `required = true`, so without this gate each
     * one grows an orphan asterisk over an empty title.
     */
    it('renders no header at all when the field has no label', () => {
      host.label.set('');
      fixture.detectChanges();

      expect(q('.field_card_header')).toBeNull();
      expect(q('.fch_required')).toBeNull();
    });

    it('treats a whitespace-only label as no label', () => {
      host.label.set('   ');
      fixture.detectChanges();

      expect(q('.field_card_header')).toBeNull();
    });

    it('drops the card chrome entirely when there is neither label nor description', () => {
      host.label.set('');
      fixture.detectChanges();

      expect(q('.field_card')).toBeNull();
      // The control itself must survive — the card is a wrapper, never a gate.
      expect(q('.projected-control')).toBeTruthy();
    });

    it('keeps the card when a label-less field still carries a description', () => {
      host.label.set('');
      host.description.set('Specify the other actor type.');
      fixture.detectChanges();

      expect(q('.field_card')).toBeTruthy();
      expect(q('.field_card_header')).toBeNull();
      expect(q('.desc_text').nativeElement.textContent).toContain('Specify the other actor type.');
    });

    it('keeps the card for a labelled field whose header the consumer suppressed', () => {
      host.showHeader.set(false);
      fixture.detectChanges();

      expect(q('.field_card')).toBeTruthy();
      expect(q('.field_card_header')).toBeNull();
    });
  });

  describe('required marker', () => {
    // Proposal 18 (14-Sep-2026): the marker is a solid `REQUIRED` tag and NOTHING else. The
    // asterisk was dropped because it sat next to the tag saying the same thing twice, and the
    // optional field deliberately carries no counterpart — the absence of the tag is the marker.
    it('marks a required field with a REQUIRED tag, not an asterisk', () => {
      expect(q('.fch_required').nativeElement.textContent.trim()).toBe('Required');
      expect(fixture.nativeElement.textContent).not.toContain('*');
    });

    it('announces requiredness to screen readers, not just with the tag', () => {
      expect(q('.sr-only').nativeElement.textContent.trim()).toBe('(required)');
    });

    it('shows no marker on a non-required field', () => {
      host.required.set(false);
      fixture.detectChanges();

      expect(q('.fch_required')).toBeNull();
      expect(q('.sr-only')).toBeNull();
    });

    it('no longer renders the Mandatory/Optional pill', () => {
      expect(q('.fch_tag')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Mandatory');
      expect(fixture.nativeElement.textContent).not.toContain('Optional');
    });
  });

  describe('state on the field', () => {
    const stateClasses = () =>
      Array.from(q('.field_card').nativeElement.classList as DOMTokenList).filter((c: string) => c.startsWith('fc-'));

    // Empty-but-required used to paint the whole card orange on load, which read as an error on a
    // form the user had not started. Completion is now answered once per section, by the bottom bar.
    it('paints nothing on a required, empty field', () => {
      expect(stateClasses()).toEqual([]);
    });

    it('paints nothing on a filled field', () => {
      host.hasValue.set(true);
      fixture.detectChanges();

      expect(stateClasses()).toEqual([]);
    });

    it('keeps the error state — an over-limit field must stay visible', () => {
      host.hasError.set(true);
      fixture.detectChanges();

      expect(stateClasses()).toEqual(['fc-error']);
    });

    it('does not paint an error on a bare (label-less) field', () => {
      host.label.set('');
      host.hasError.set(true);
      fixture.detectChanges();

      expect(q('.field_card')).toBeNull();
    });
  });

  describe('pinned guidance (14-sep-2026)', () => {
    const PIN_KEY = 'pr-field-guidance-pin:my-field';

    beforeEach(() => localStorage.removeItem(PIN_KEY));
    afterEach(() => localStorage.removeItem(PIN_KEY));

    const guidance = () => q('.field_card_desc');
    /**
     * El botón vive DENTRO de la burbuja del tooltip, que monta la directiva en `document.body`.
     * Lo que le corresponde a ESTE componente es el cableado: que ofrezca la acción cuando hay guía
     * que fijar, y que responda al evento. Lo que pinta la burbuja se prueba en la directiva.
     */
    const tooltipDir = () => {
      const el = fixture.debugElement.query(By.directive(PrTooltipDirective));
      return el ? (el.injector.get(PrTooltipDirective) as PrTooltipDirective) : null;
    };
    const pinAction = () => tooltipDir()?.prTooltipAction ?? null;
    const clickPin = () => {
      tooltipDir()!.prTooltipActionClick.emit();
      fixture.detectChanges();
    };

    it('offers the pin only when the field actually has guidance to pin', () => {
      host.description.set('');
      host.tooltip.set('');
      fixture.detectChanges();
      expect(tooltipDir()).toBeNull();

      host.tooltip.set('Write a short, self-explanatory name.');
      fixture.detectChanges();
      expect(pinAction()).toEqual({ label: 'Pin guidance', pressed: false, closeAfterClick: true });
    });

    it('pins the tooltip text into the card, and remembers it in localStorage', () => {
      host.description.set('');
      host.tooltip.set('Write a short, self-explanatory name.');
      fixture.detectChanges();
      expect(guidance()).toBeNull();

      clickPin();

      expect(guidance().nativeElement.textContent).toContain('Write a short, self-explanatory name.');
      expect(localStorage.getItem(PIN_KEY)).toBe('1');
      // La etiqueta que recibe la burbuja cambia con el estado, para que el botón diga cómo soltarla.
      expect(pinAction()).toEqual({ label: 'Unpin guidance', pressed: true, closeAfterClick: true });
    });

    it('unpins back, and the stored value says so — not just the absence of a key', () => {
      host.tooltip.set('Guidance');
      fixture.detectChanges();
      clickPin();
      clickPin();

      expect(localStorage.getItem(PIN_KEY)).toBe('0');
      expect(q('.fc-pinned')).toBeNull();
    });

    /** 🛑 El default solo manda cuando el usuario NO ha elegido: una preferencia guardada gana. */
    it('starts pinned when the field asks for it, and a stored choice still wins', () => {
      localStorage.setItem(PIN_KEY, '0');
      const other = TestBed.createComponent(HostComponent);
      other.componentInstance.tooltip.set('Guidance');
      other.componentInstance.pinByDefault.set(true);
      other.detectChanges();
      expect(other.debugElement.query(By.css('.fc-pinned'))).toBeNull();

      localStorage.removeItem(PIN_KEY);
      const fresh = TestBed.createComponent(HostComponent);
      fresh.componentInstance.tooltip.set('Guidance');
      fresh.componentInstance.pinByDefault.set(true);
      fresh.detectChanges();
      expect(fresh.debugElement.query(By.css('.fc-pinned'))).toBeTruthy();
    });
  });

  describe('edition marked by pointer (14-sep-2026)', () => {
    const card = () => q('.field_card').nativeElement as HTMLElement;
    const cmp = () =>
      fixture.debugElement.query(By.directive(FieldCardComponent)).componentInstance as FieldCardComponent;

    /**
     * 🛑 El caso que lo motivó: el sí/no y el segmentado de puntuación NO son controles nativos, no
     * emiten `input` ni `change`, y sin esto quedaban fuera de todo lo que depende de "el usuario
     * tocó este campo" — la píldora de sin guardar y la bolita de completado.
     */
    it('counts a click on the projected control as an edit', () => {
      expect(cmp().edited()).toBe(false);
      (q('.projected-control').nativeElement as HTMLElement).click();
      fixture.detectChanges();
      expect(cmp().edited()).toBe(true);
    });

    it('does NOT count a click on the header or the guidance — reading is not editing', () => {
      host.tooltip.set('Guidance');
      host.description.set('Some guidance');
      fixture.detectChanges();

      (q('.field_card_header').nativeElement as HTMLElement).click();
      (q('.field_card_desc').nativeElement as HTMLElement).click();
      fixture.detectChanges();

      expect(cmp().edited()).toBe(false);
      // Control positivo desde el MISMO montaje: sin esto, un `edited` que nunca se pone a true
      // también pasaría este test.
      (q('.projected-control').nativeElement as HTMLElement).click();
      fixture.detectChanges();
      expect(cmp().edited()).toBe(true);
    });
  });
});
