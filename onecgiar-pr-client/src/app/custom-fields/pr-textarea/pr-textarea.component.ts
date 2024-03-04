import { Component, forwardRef, Input } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR
} from '@angular/forms';
import { WordCounterService } from '../../shared/services/word-counter.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';
import { CommonModule } from '@angular/common';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { PrWordCounterComponent } from '../pr-word-counter/pr-word-counter.component';
import { PrFieldValidationsComponent } from '../pr-field-validations/pr-field-validations.component';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
@Component({
  selector: 'app-pr-textarea',
  standalone: true,
  templateUrl: './pr-textarea.component.html',
  styleUrls: ['./pr-textarea.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    InputTextareaModule,
    PrWordCounterComponent,
    PrFieldValidationsComponent,
    PrFieldHeaderComponent
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrTextareaComponent),
      multi: true
    }
  ]
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

  private _value: string;
  private beforeValue: string;
  public wordCount: number = 0;
  public notProvidedText = "<div class='not_provided_color'>Not provided</div>";
  constructor(
    private wordCounterSE: WordCounterService,
    public rolesSE: RolesService,
    public dataControlSE: DataControlService
  ) {}

  get value() {
    if (this.beforeValue !== this._value && this.maxWords)
      this.wordCount = this.wordCounterSE.counter(this._value);
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
