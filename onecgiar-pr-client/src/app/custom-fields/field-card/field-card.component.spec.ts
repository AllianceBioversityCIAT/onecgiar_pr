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
    [showDescription]="showDescription()">
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

    it('is pinnable, so the guidance survives the pointer leaving and its links stay clickable', () => {
      const directive = fixture.debugElement.query(By.directive(PrTooltipDirective)).injector.get(PrTooltipDirective);
      expect(directive.prTooltipPinnable).toBe(true);
    });

    it('keeps the colour legend when no guidance is provided', () => {
      host.tooltip.set('');
      fixture.detectChanges();
      expect(q('.sgi-dac-info')).toBeNull();
      expect(q('.fch_info_wrap')).toBeTruthy();
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
     * one grows an orphan "Mandatory" pill over an empty title.
     */
    it('renders no header at all when the field has no label', () => {
      host.label.set('');
      fixture.detectChanges();

      expect(q('.field_card_header')).toBeNull();
      expect(q('.fch_tag')).toBeNull();
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

  describe('requiredness tag', () => {
    it('tags a required field as Mandatory', () => {
      expect(q('.fch_tag').nativeElement.textContent.trim()).toBe('Mandatory');
    });

    it('tags a non-required field as Optional', () => {
      host.required.set(false);
      fixture.detectChanges();

      expect(q('.fch_tag').nativeElement.textContent.trim()).toBe('Optional');
    });
  });

  describe('derived state — this is what colours every field in the app', () => {
    const stateClass = () =>
      Array.from(q('.field_card').nativeElement.classList as DOMTokenList).filter((c: string) => c.startsWith('fc-'));

    it('is pending when required and empty', () => {
      expect(stateClass()).toEqual(['fc-pending']);
    });

    it('is optional — not pending — when not required and empty', () => {
      host.required.set(false);
      fixture.detectChanges();

      expect(stateClass()).toEqual(['fc-optional']);
    });

    it('is done once the field holds a value, required or not', () => {
      host.hasValue.set(true);
      fixture.detectChanges();

      expect(stateClass()).toEqual(['fc-done']);
    });

    it('lets an error outrank a value', () => {
      host.hasValue.set(true);
      host.hasError.set(true);
      fixture.detectChanges();

      expect(stateClass()).toEqual(['fc-error']);
    });

    it('lets an explicit [state] override everything derived', () => {
      const card = fixture.debugElement.query(By.directive(FieldCardComponent)).componentInstance as FieldCardComponent;
      card.hasValue = true;
      card.state = 'pending';

      expect(card.computedState).toBe('pending');
    });
  });
});
