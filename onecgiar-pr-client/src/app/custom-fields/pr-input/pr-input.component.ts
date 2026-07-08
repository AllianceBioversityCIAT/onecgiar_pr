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
  readonly effectivePlaceholder = computed(() => this.fieldConfig()?.placeholder ?? this.placeholder());
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

  set value(v: string) {
    if (v !== this._value()) {
      if (this.type() === 'link') v = v.trim();

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
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}
