import { Component, forwardRef, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 's-select',
  templateUrl: './s-select.component.html',
  styleUrls: ['./s-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SSelectComponent),
      multi: true
    }
  ],
  standalone: false
})
export class SSelectComponent implements ControlValueAccessor {
  @Input() optionLabel: string;
  @Input() optionValue: string;
  @Input() options: any;
  @Input() placeholder: string;
  @Input() label: string;
  @Input() description: string;
  @Input() readOnly: boolean;
  @Input() isStatic: boolean;
  @Input() required: boolean = true;
  @Input() flagsCode: string;
  @Input() disableOptions: any;
  @Input() disableOptionsText: any = '';
  @Input() disabled: any = false;
  @Input() editable: boolean = false;
  @Input() showPartnerAlert: boolean = false;
  @Input() extraInformation: boolean = false;
  @Input() indexReference: number = null;
  @Input() noDataText: string = '';
  @Input() fieldDisabled: boolean = false;
  @Input() group: boolean = false;
  @Input() groupCode: string = '';
  @Input() groupName: string = '';
  @Input() descInlineStyles?: string = '';
  @Input() labelDescInlineStyles?: string = '';
  @Input() optionsInlineStyles?: string = '';
  @Input() showDescriptionLabel?: boolean = false;
  @Input() truncateSelectionText?: boolean = false;
  @Input() inlineStylesContainer?: string = '';
  @Input() _value: string;
  @Input() expandSpaceOnOpen?: boolean = false; // Enable 300px expansion when open

  @Output() selectOptionEvent = new EventEmitter();

  private _optionsIntance: any[];
  public fullValue: any = {};
  public searchText: string;
  public isDropdownOpen?: boolean = false; // Track dropdown state

  constructor(
    public rolesSE: RolesService,
    public dataControlSE: DataControlService,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.expandSpaceOnOpen && this.isDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  get value(): any {
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

  removeFocus(option?) {
    if (option?.disabled) return;
    const element: any = document.getElementById(this.optionValue + (this.indexReference || ''));
    element.blur();
    if (this.expandSpaceOnOpen) {
      this.isDropdownOpen = false; // Close dropdown only if expansion is enabled
    }
  }

  onDropdownOpen() {
    if (this.expandSpaceOnOpen) {
      this.isDropdownOpen = true; // Only track state if expansion is enabled
    }
  }
  cont = 0;
  get optionsIntance() {
    this.cont++;
    console.log('mero event', this.cont);
    if (!this.options?.length) return [];
    if (!this._optionsIntance?.length) this._optionsIntance = [...this.options];

    this._optionsIntance.forEach((resp: any) => {
      resp.disabled = false;
      resp.selected = false;
    });

    this.disableOptions?.map(disableOption => {
      const itemFinded = this._optionsIntance.find(listItem => listItem[this.optionValue] == disableOption[this.optionValue]);
      if (itemFinded && itemFinded[this.optionValue] != this.value) itemFinded.disabled = true;
    });
    this.fullValue[this.optionValue] = this.value;

    if (!this.value) return this._optionsIntance;
    const id = typeof this.value == 'object' ? this.value[this.optionValue] : this.value;
    const itemFinded = this._optionsIntance?.find(listItem => listItem[this.optionValue] == id);
    if (!itemFinded) return this._optionsIntance;
    itemFinded.selected = true;
    this.fullValue[this.optionLabel] = itemFinded[this.optionLabel];

    return this._optionsIntance;
  }

  onSelectOption(option) {
    if (option?.disabled) return;
    this.fullValue = option;
    this.value = option[this.optionValue];
    option.selected = true;
    this.selectOptionEvent.emit(option);
    if (this.expandSpaceOnOpen) {
      this.isDropdownOpen = false; // Close dropdown only if expansion is enabled
    }
  }

  labelName(value) {
    return '';
  }
}
