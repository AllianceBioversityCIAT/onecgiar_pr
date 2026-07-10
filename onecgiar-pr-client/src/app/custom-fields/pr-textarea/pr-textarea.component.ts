import { Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WordCounterService } from '../../shared/services/word-counter.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { FieldsManagerService } from '../../shared/services/fields-manager.service';

@Component({
  selector: 'app-pr-textarea',
  templateUrl: './pr-textarea.component.html',
  styleUrls: ['./pr-textarea.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrTextareaComponent),
      multi: true
    }
  ],
  standalone: false
})
export class PrTextareaComponent implements ControlValueAccessor {
  readonly placeholder = input<string>();
  readonly label = input<string>();
  readonly description = input<string>();
  readonly maxWords = input<number>();
  readonly readOnly = input<boolean>();
  readonly isStatic = input<boolean>(false);
  readonly required = input<boolean>(true);
  readonly hint = input<string>(null);
  readonly rows = input<number>(5);
  readonly autogenerate = input<boolean>(false);
  readonly fieldRef = input<string | number>();
  readonly disabled = input<boolean>();
  readonly showDescriptionLabel = input<boolean>(true);
  readonly labelDescInlineStyles = input<string>('');

  private readonly wordCounterSE = inject(WordCounterService);
  readonly rolesSE = inject(RolesService);
  readonly dataControlSE = inject(DataControlService);
  readonly fieldsManager = inject(FieldsManagerService);

  private readonly _value = signal<string>(undefined);
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
  readonly effectiveRequired = computed(() => this.fieldConfig()?.required ?? this.required());

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
      this._value.set(v);
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
