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

  fieldsManager = inject(FieldsManagerService);

  private _value: any;
  private beforeValue: string;
  public wordCount: number = 0;
  public notProvidedText = "<div class='text-red-100 italic'>Not provided</div>";

  preventFieldRender = computed<boolean>(() => {
    if (!this.fieldRef) return true;
    const { show, label, placeholder, description, required } = this.fieldsManager.fields()[this.fieldRef] || {};
    this.label = label;
    this.placeholder = placeholder;
    this.description = description;
    console.log(this.fieldRef);
    this.required = required;
    console.log(this.required);
    return show;
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

  set value(v: string) {
    if (v !== this._value) {
      if (this.type === 'link') v = v.trim();

      this._value = v;
      if (Number(v) < 0) this._value = 0;
      this.onChange(v);
    }
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
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}
