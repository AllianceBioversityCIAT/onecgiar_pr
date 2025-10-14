import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WordCounterService } from '../../shared/services/word-counter.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
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
  @Input() placeholder: string;
  @Input() label: string;
  @Input() description: string;
  @Input() maxWords: number;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean = false;
  @Input() required: boolean = true;
  @Input() hint: string = null;
  @Input() rows: number = 5;
  @Input() autogenerate?: boolean = false;
  @Input() labelDescInlineStyles?: string = '';

  private _value: string;
  private beforeValue: string;
  public wordCount: number = 0;
  public notProvidedText = "<div class='text-red-100 italic'>Not provided</div>";
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
      this._value = v;
      this.onChange(v);
    }
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
