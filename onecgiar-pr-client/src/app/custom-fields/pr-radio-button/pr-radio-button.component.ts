import { Component, forwardRef, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { FieldsManagerService } from '../../shared/services/fields-manager.service';
@Component({
  selector: 'app-pr-radio-button',
  templateUrl: './pr-radio-button.component.html',
  styleUrls: ['./pr-radio-button.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrRadioButtonComponent),
      multi: true
    }
  ],
  standalone: false
})
export class PrRadioButtonComponent implements ControlValueAccessor {
  @Input() options: any;
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() label: string;
  @Input() description: string;
  @Input() tooltip: string = '';
  @Input() subLabel: string;
  @Input() required: boolean = true;
  @Input() hideOptions: boolean;
  @Input() readOnly: boolean;
  @Input() disabled: boolean = false;
  @Input() isStatic: boolean = false;
  @Input() verticalAlignment: boolean = false;
  /**
   * `segmented` paints the options as one shared track instead of a list of radios — the shape the
   * mockup uses for the Impact Area scores, where the three options are a short ordered scale
   * (0 / 1 / 2) and the answer reads better as a position than as a list.
   *
   * It is a VARIANT, not a replacement: the plain list is still right for Capacity Sharing's
   * questions and anything whose options are full sentences or carry sub-inputs.
   */
  @Input() variant: 'list' | 'segmented' = 'list';
  @Input() fieldRef: string | number;
  @Input() textInputWhenSelectedLabels: string[] = [];
  @Input() textInputPlaceholder: string = 'Why?';
  @Input() textInputPlaceholderOverrides: { [label: string]: string } | null = null;
  @Input() textInputRequiredWhenSelectedLabels: string[] = [];
  @Input() textInputLabel: string | null = null;
  @Input() textInputLabelOverrides: { [label: string]: string } | null = null;
  @Input() checkboxConfig: {
    listAttr: string;
    optionLabel: string;
    optionValue: string;
    optionTextValue: string;
    showInputIfAttr?: string;
  } = { listAttr: '', optionLabel: '', optionValue: '', optionTextValue: '', showInputIfAttr: '' };
  @Output() selectOptionEvent = new EventEmitter<any>();
  private _value: string;
  /**
   * Unique per-instance prefix. It names the native radio group (so browser grouping never bleeds
   * across components) AND seeds each option's `id`/`for` pair. P2-3350: the ids used to be
   * `radio_{{i}}`, indexed only within this component's own *ngFor, so every instance on a page
   * emitted the same ids — and `<label for>` resolves through getElementById(), which always
   * returns the FIRST match. Clicking a later group's option text checked an earlier group's radio.
   */
  private static _nextId = 0;
  readonly groupName = `pr-radio-group-${PrRadioButtonComponent._nextId++}`;
  fieldsManager = inject(FieldsManagerService);
  constructor(
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

  get value() {
    return this._value;
  }

  set value(v: any) {
    if (v !== this._value) {
      this._value = v;
      this.onChange(v);
    }
  }

  /**
   * Whether an option is selected — deliberately the SAME test as the `complete` class in the
   * template, which is what `DataControlService` scans (and which is unchanged since before the
   * redesign). Rejecting `''` here too would paint the card orange for a value the alert list
   * counts as complete.
   */
  get hasValue(): boolean {
    return this._value !== null && this._value !== undefined;
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    this._value = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  joinName() {
    return this.label?.split(' ')?.join('');
  }

  preventFieldRender = computed<boolean>(() => {
    if (!this.fieldRef) return true;
    const { hide, label, description, required } = this.fieldsManager.fields()[this.fieldRef] || {};
    this.label = label;
    this.description = description;
    this.required = required;
    return !hide;
  });

  currentVal = null;

  /**
   * Splits `(0) Not Targeted` into its digit and its wording so the track can set the number in
   * mono, as the mockup does. `full_name` is built as `(${id - 1}) ${title}` by
   * `GET_allGenderTag`, so the shape is guaranteed for the scores — but any option that does not
   * match just renders whole, which keeps the variant safe for other option sets.
   */
  segmentParts(option: any): { digit: string | null; text: string } {
    const raw = String(option?.[this.optionLabel] ?? '');
    const match = /^\((\d+)\)\s*(.*)$/.exec(raw);
    return match ? { digit: match[1], text: match[2] } : { digit: null, text: raw };
  }

  get segmentsDisabled(): boolean {
    return (this.readOnly || this.disabled || this.rolesSE.readOnly) && !this.isStatic;
  }

  onSelect(clickedValue: any) {
    this.selectOptionEvent.emit();

    // If clicking the already-selected option, deselect it
    if (this.value === clickedValue && clickedValue !== null) {
      this.value = null;
      this.currentVal = null;
    }
  }

  onSelectSegment(optionVal: any) {
    if (this.segmentsDisabled) return;

    if (this.value === optionVal && optionVal !== null) {
      this.value = null;
      this.currentVal = null;
    } else {
      this.value = optionVal;
      this.currentVal = optionVal;
    }
    this.onTouch();
    this.onValueChange(this.value);
    this.selectOptionEvent.emit();
  }

  onValueChange(newValue: any) {
    // Update current value for next comparison
    this.currentVal = newValue;

    // Clear sub-options when value changes
    if (this.checkboxConfig.listAttr) {
      this.options.forEach((option: any) => {
        if (option.subOptions) {
          option.subOptions.forEach((subOption: any) => {
            subOption.answer_boolean = false;
            subOption.answer_text = null;
          });
        }
      });
    }
  }

  get valueName() {
    const optionFinded = this.options.find((option: any) => option[this.optionValue] == this.value);
    if (optionFinded) return optionFinded[this.optionLabel];
    return "<div class='text-red-100 italic'>Not provided</div>";
  }

  setAnswerTextToNull(option) {
    if (!option.answer_boolean) {
      option.answer_text = null;
    }
  }
}
