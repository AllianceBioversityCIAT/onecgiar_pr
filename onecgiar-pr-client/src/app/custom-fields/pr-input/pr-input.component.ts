import { Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WordCounterService } from '../../shared/services/word-counter.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { FieldsManagerService } from '../../shared/services/fields-manager.service';

@Component({
  selector: 'app-pr-input',
  templateUrl: './pr-input.component.html',
  styleUrls: ['./pr-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrInputComponent),
      multi: true
    }
  ],
  standalone: false
})
export class PrInputComponent implements ControlValueAccessor {
  readonly placeholder = input<string>();
  readonly type = input<string>();
  readonly label = input<string>();
  readonly description = input<string>();
  readonly maxWords = input<number>();
  readonly readOnly = input<boolean>();
  readonly isStatic = input<boolean>(false);
  readonly required = input<boolean>(true);
  readonly underConstruction = input<boolean>();
  readonly disabled = input<boolean>();
  readonly hint = input<string>(null);
  readonly editable = input<boolean>(false);
  readonly noDataText = input<string>('');
  readonly autogenerate = input<boolean>(false);

  readonly variant = input<'xs' | 'sm'>();
  readonly numberMode = input<'decimal'>();
  readonly maxDecimals = input<number>(2);
  readonly showDescription = input<boolean>(true);
  readonly InlineStyles = input<string>('');
  readonly descInlineStyles = input<string>('');
  readonly fieldRef = input<string | number>();
  readonly customLabel = input<string>();
  /** When true, `required` comes from the parent input instead of FieldsManager (lead contact scan workaround). */
  readonly lockRequiredFromFieldManager = input<boolean>(false);
  readonly showFieldHeader = input<boolean>(true);
  readonly labelDescInlineStyles = input<string>('');

  private readonly wordCounterSE = inject(WordCounterService);
  readonly rolesSE = inject(RolesService);
  readonly dataControlSE = inject(DataControlService);
  readonly fieldsManager = inject(FieldsManagerService);

  private readonly _value = signal<any>(null);
  public notProvidedText = "<div class='text-red-100 italic'>Not provided</div>";

  /** FieldsManager entry for this field (when `fieldRef` is set). */
  private readonly fieldConfig = computed(() => {
    const ref = this.fieldRef();
    return ref ? this.fieldsManager.fields()[ref] : undefined;
  });

  /** Presentation values: FieldsManager overrides the inputs, with input fallback. */
  readonly effectiveLabel = computed(() => this.fieldConfig()?.label ?? this.label());
  // Fall back to '' — never let an unset placeholder reach the DOM as the literal "undefined".
  readonly effectivePlaceholder = computed(() => this.fieldConfig()?.placeholder ?? this.placeholder() ?? '');
  readonly effectiveDescription = computed(() => this.fieldConfig()?.description ?? this.description());
  readonly effectiveRequired = computed(() => {
    if (this.lockRequiredFromFieldManager()) return this.required();
    return this.fieldConfig()?.required ?? this.required();
  });
  readonly effectiveUseColon = computed(() => this.fieldConfig()?.useColon ?? true);

  /** Render gate — pure derivation (no state mutation). */
  readonly shouldRender = computed<boolean>(() => {
    const ref = this.fieldRef();
    if (!ref) return true;
    return !this.fieldConfig()?.hide;
  });

  /** Word count derived reactively from the current value. */
  readonly wordCount = computed<number>(() => (this.maxWords() ? this.wordCounterSE.counter(this._value()) : 0));

  get value() {
    return this._value();
  }

  set value(v: any) {
    if (v !== this._value()) {
      if (this.type() === 'link' && typeof v === 'string') v = v.trim();

      // Preserve legacy behavior: store clamped value but propagate the raw v.
      this._value.set(Number(v) < 0 ? (0 as any) : v);
      this.onChange(v);
    }
  }

  /** Whether the field currently holds a non-empty value. */
  get hasValue(): boolean {
    const v = this._value();
    return v !== null && v !== undefined && String(v).trim() !== '';
  }

  /**
   * Field status drives the colored card header:
   * - error   (red)    → exceeds the word limit / invalid
   * - optional(blue)   → not required
   * - done    (green)  → required and filled
   * - pending (yellow) → required and empty
   */
  get fieldState(): 'optional' | 'pending' | 'done' | 'error' {
    const maxWords = this.maxWords();
    if (maxWords && this.wordCount() > maxWords && !this.autogenerate()) return 'error';
    if (this.hasValue) return 'done'; // green = filled/valid (optional or required)
    return this.effectiveRequired() ? 'pending' : 'optional'; // yellow vs blue when empty
  }

  /**
   * Currency field (replaces the old numeric field). `currencyRaw` is what the
   * `<input>` shows. While editing it holds exactly what the user types (so
   * decimals like "10." work — nothing rewrites the field mid-typing). It only
   * reformats to USD on blur / focus / external value change. The stored model
   * value stays numeric.
   */
  currencyRaw = '';

  private toCurrencyString(v: any): string {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return isNaN(n) ? '' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  /** Blurred/loaded state: show the USD-formatted value. */
  syncCurrencyRaw() {
    this.currencyRaw = this.toCurrencyString(this._value());
  }

  /** On focus, show the raw number so it's freely editable. */
  onCurrencyFocus() {
    const v = this._value();
    this.currencyRaw = v === null || v === undefined || v === '' ? '' : String(v);
  }

  /** On blur, parse what was typed into a number and reformat for display. */
  onCurrencyBlur() {
    const cleaned = (this.currencyRaw ?? '').replace(/[^0-9.]/g, '');
    const n = cleaned === '' ? null : Number(cleaned);
    this.value = n === null || isNaN(n) ? null : n < 0 ? 0 : n;
    this.syncCurrencyRaw();
  }

  /**
   * Numeric field. Staging rendered `type="number"` with PrimeNG's `<p-inputNumber>`, which grouped
   * thousands (`123,123`) and honoured `numberMode`/`maxDecimals`. The Spartan migration replaced it
   * with a bare `<input type="number">` and the grouping was lost, so saved figures read differently
   * from prtest. This mirrors the currency field: `numberRaw` is what the input shows — the digits
   * exactly as typed while focused, grouped on blur / load — and the stored model stays numeric.
   */
  numberRaw = '';

  private toNumberString(v: any): string {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (isNaN(n)) return '';
    return n.toLocaleString(
      'en-US',
      this.numberMode() ? { minimumFractionDigits: 2, maximumFractionDigits: this.maxDecimals() } : { maximumFractionDigits: 0 }
    );
  }

  /** Blurred/loaded state: show the grouped value. */
  syncNumberRaw() {
    this.numberRaw = this.toNumberString(this._value());
  }

  /** On focus, show the raw number so it is freely editable. */
  onNumberFocus() {
    const v = this._value();
    this.numberRaw = v === null || v === undefined || v === '' ? '' : String(v);
  }

  /**
   * While typing, keep the bound model in sync (the old `<p-inputNumber>` did too) WITHOUT rewriting
   * what the user is typing — reformatting mid-typing would move the caret and break entries like
   * "10.".
   */
  onNumberInput() {
    const cleaned = this.sanitizeNumberInput(this.numberRaw);
    // Only rewrite the field to DROP characters the old control never accepted (letters, a second
    // dot, a minus sign) — never to reformat, so the caret stays put while typing.
    if (cleaned !== this.numberRaw) this.numberRaw = cleaned;
    const parsed = cleaned === '' ? null : Number(cleaned);
    const next = parsed === null || isNaN(parsed) ? null : parsed < 0 ? 0 : parsed;
    if (next !== this._value()) {
      this._value.set(next);
      this.onChange(next);
    }
  }

  /**
   * Keeps only what `<p-inputNumber>` used to accept: digits, and a single decimal point when
   * `numberMode` is set (`[min]="0"` made a minus sign unreachable, and integer mode had
   * `maxFractionDigits` 0).
   */
  private sanitizeNumberInput(raw: string): string {
    let cleaned = (raw ?? '').replace(/[^0-9.]/g, '');
    if (!this.numberMode()) return cleaned.replace(/\./g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    return cleaned;
  }

  /** On blur, parse what was typed into a number and reformat for display. */
  onNumberBlur() {
    const cleaned = this.sanitizeNumberInput(this.numberRaw);
    const n = cleaned === '' ? null : Number(cleaned);
    this.value = n === null || isNaN(n) ? null : n < 0 ? 0 : n;
    this.syncNumberRaw();
  }

  get badLink() {
    const regex = new RegExp(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,6}(:\d{1,5})?(\/\S*)?$/i);

    const value = this.value ? this.value.trim() : '';

    return !regex.test(value);
  }

  aTag(link) {
    return `<a class="open_route" target="_blank" href="${link}">${link}</a>`;
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    this._value.set(value);
    if (this.type() === 'currency') this.syncCurrencyRaw();
    if (this.type() === 'number') this.syncNumberRaw();
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}
