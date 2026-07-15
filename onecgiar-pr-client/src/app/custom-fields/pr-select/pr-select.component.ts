import { Component, computed, ElementRef, forwardRef, HostListener, inject, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { RolesService } from '../../shared/services/global/roles.service';
import { DataControlService } from '../../shared/services/data-control.service';

@Component({
  selector: 'app-pr-select',
  templateUrl: './pr-select.component.html',
  styleUrls: ['./pr-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrSelectComponent),
      multi: true
    }
  ],
  standalone: false
})
export class PrSelectComponent implements ControlValueAccessor {
  readonly optionLabel = input<string>();
  readonly optionValue = input<string>();
  readonly options = input<any>();
  readonly placeholder = input<string>();
  readonly label = input<string>();
  readonly description = input<string>();
  // P2-3061: optional info tooltip rendered next to the label (forwarded to app-pr-field-header).
  readonly tooltip = input<string>('');
  readonly readOnly = input<boolean>();
  readonly isStatic = input<boolean>();
  readonly required = input<boolean>(true);
  readonly flagsCode = input<string>();
  readonly disableOptions = input<any>();
  readonly disableOptionsText = input<any>('');
  readonly disabled = input<any>(false);
  readonly editable = input<boolean>(false);
  readonly showPartnerAlert = input<boolean>(false);
  readonly extraInformation = input<boolean>(false);
  readonly indexReference = input<number>(null);
  readonly noDataText = input<string>('');
  readonly fieldDisabled = input<boolean>(false);
  readonly group = input<boolean>(false);
  readonly groupCode = input<string>('');
  readonly groupName = input<string>('');
  readonly descInlineStyles = input<string>('');
  readonly labelDescInlineStyles = input<string>('');
  readonly overlayToBody = input<boolean>(false); // When true, position dropdown as fixed overlay
  readonly showClear = input<boolean>(false); // When true, show a clear (×) button to reset the selection
  readonly idKey = input<string>('');
  readonly showDescriptionLabel = input<boolean>(false);
  readonly truncateSelectionText = input<boolean>(false);
  readonly inlineStylesContainer = input<string>('');
  readonly expandSpaceOnOpen = input<boolean>(false); // Enable 300px expansion when open
  /** Consumer-provided inline styles for the dropdown panel (used only when overlayToBody is false). */
  readonly optionsInlineStyles = input<string>('');

  readonly selectOptionEvent = output<any>();

  private readonly elementRef = inject(ElementRef);
  readonly rolesSE = inject(RolesService);
  readonly dataControlSE = inject(DataControlService);

  private readonly _sig = signal<any>(null);
  public fullValue: any = {};
  public searchText: string;
  readonly isDropdownOpen = signal<boolean>(false); // Track dropdown state
  /** Internal overlay positioning styles (no consumer binds this; kept internal). */
  readonly overlayStyles = signal<string>('');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.expandSpaceOnOpen() && this.isDropdownOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }

  get value(): any {
    return this._sig();
  }

  set value(v: string) {
    if (v !== this._sig()) {
      this._sig.set(v);
      this.onChange(v);
    }
  }

  /** Backward-compat bridge: user-management pokes `_value` via @ViewChild to reset filters. */
  get _value(): any {
    return this._sig();
  }
  set _value(v: any) {
    this._sig.set(v);
  }

  onChange(_) {}

  onTouch() {}

  writeValue(value: any): void {
    this._sig.set(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  removeFocus(option?) {
    if (option?.disabled) return;
    const triggerId = (this.idKey() || this.optionValue()) + '_' + (this.indexReference() ?? '');
    const element: any = document.getElementById(triggerId);
    element?.blur();
    if (this.expandSpaceOnOpen()) {
      this.isDropdownOpen.set(false); // Close dropdown only if expansion is enabled
    }
    if (this.overlayToBody()) {
      // Reset inline styles so next open recalculates position
      this.overlayStyles.set('');
    }
  }

  onDropdownOpen() {
    if (this.expandSpaceOnOpen()) {
      this.isDropdownOpen.set(true); // Only track state if expansion is enabled
    }
    if (this.overlayToBody()) {
      const triggerId = (this.idKey() || this.optionValue()) + '_' + (this.indexReference() ?? '');
      const triggerElement: any = document.getElementById(triggerId);
      if (triggerElement) {
        const rect = triggerElement.getBoundingClientRect();
        const top = rect.bottom + 4;
        const left = rect.left;
        const width = rect.width;
        this.overlayStyles.set(`position: fixed; left: ${left}px; top: ${top}px; width: ${width}px; max-height: 300px; z-index: 10000; transform: none; bottom: auto;`);
      }
    }
  }

  /**
   * Options decorated with `selected`/`disabled` flags — derived from the current value and
   * `disableOptions` over a CLONED copy, so the parent's original `options` array is never mutated.
   */
  readonly optionsIntance = computed<any[]>(() => {
    const opts = this.options();
    if (!opts?.length) return [];

    const optionValue = this.optionValue();
    const clones = opts.map((o: any) => ({ ...o, disabled: false, selected: false }));

    const val = this._sig();
    const id = val != null && typeof val === 'object' ? val[optionValue] : val;

    this.disableOptions()?.forEach((disableOption: any) => {
      const itemFinded = clones.find((listItem: any) => listItem[optionValue] == disableOption[optionValue]);
      if (itemFinded && itemFinded[optionValue] != id) itemFinded.disabled = true;
    });

    if (id !== null && id !== undefined && id !== '') {
      const itemFinded = clones.find((listItem: any) => listItem[optionValue] == id);
      if (itemFinded) itemFinded.selected = true;
    }

    return clones;
  });

  onSelectOption(option) {
    if (option?.disabled) return;
    this.fullValue = option;
    // Whole-object binding when no optionValue is provided (mirrors PrimeNG p-select without optionValue).
    this.value = this.optionValue() ? option[this.optionValue()] : option;
    option.selected = true;
    this.selectOptionEvent.emit(option);
    if (this.expandSpaceOnOpen()) {
      this.isDropdownOpen.set(false); // Close dropdown only if expansion is enabled
    }
  }

  /** Clears the current selection (used when `showClear` is enabled — mirrors PrimeNG `[showClear]`). */
  clearSelection(event?: Event) {
    event?.stopPropagation();
    this.fullValue = null;
    this.value = null;
    this.selectOptionEvent.emit(null);
  }
}
