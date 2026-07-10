import { Component, computed, forwardRef, inject, Input } from '@angular/core';
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
  @Input() placeholder: string;
  @Input() type: string;
  @Input() label: string;
  @Input() description: string;
  @Input() maxWords: number;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean = false;
  @Input() required: boolean = true;
  @Input() underConstruction: boolean;
  @Input() disabled: boolean;
  @Input() hint: string = null;
  @Input() editable: boolean = false;
  @Input() noDataText: string = '';
  @Input() autogenerate: boolean = false;

  @Input() variant?: 'xs' | 'sm';
  @Input() numberMode?: 'decimal';
  @Input() maxDecimals?: number = 2;
  @Input() showDescription?: boolean = true;
  @Input() InlineStyles?: string = '';
  @Input() descInlineStyles?: string = '';
  @Input() fieldRef: string | number;
  @Input() customLabel?: string;
  /** When true, `required` comes from the parent `@Input()` instead of FieldsManager (lead contact scan workaround). */
  @Input() lockRequiredFromFieldManager = false;
  @Input() showFieldHeader = true;

  fieldsManager = inject(FieldsManagerService);
  @Input() labelDescInlineStyles?: string = '';

  private _value: any;
  private beforeValue: string;
  public wordCount: number = 0;
  public notProvidedText = "<div class='text-red-100 italic'>Not provided</div>";

  useColon: boolean = true;

  preventFieldRender = computed<boolean>(() => {
    if (!this.fieldRef) return true;
    const { hide, label, placeholder, description, required, useColon } = this.fieldsManager.fields()[this.fieldRef] || {};
    this.label = label;
    this.placeholder = placeholder;
    this.description = description;
    if (!this.lockRequiredFromFieldManager) {
      this.required = required;
    }
    this.useColon = useColon ?? true;
    return !hide;
  });

  constructor(
    private readonly wordCounterSE: WordCounterService,
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

  get value() {
    if (this.beforeValue !== this._value && this.maxWords) this.wordCount = this.wordCounterSE.counter(this._value);
    this.beforeValue = this._value;
    return this._value;
  }

  set value(v: any) {
    if (v !== this._value) {
      if (this.type === 'link' && typeof v === 'string') v = v.trim();

      this._value = v;
      if (Number(v) < 0) this._value = 0;
      this.onChange(v);
    }
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
    this.currencyRaw = this.toCurrencyString(this._value);
  }

  /** On focus, show the raw number so it's freely editable. */
  onCurrencyFocus() {
    const v = this._value;
    this.currencyRaw = v === null || v === undefined || v === '' ? '' : String(v);
  }

  /** On blur, parse what was typed into a number and reformat for display. */
  onCurrencyBlur() {
    const cleaned = (this.currencyRaw ?? '').replace(/[^0-9.]/g, '');
    const n = cleaned === '' ? null : Number(cleaned);
    this.value = n === null || isNaN(n) ? null : n < 0 ? 0 : n;
    this.syncCurrencyRaw();
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
    this._value = value;
    if (this.type === 'currency') this.syncCurrencyRaw();
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}
