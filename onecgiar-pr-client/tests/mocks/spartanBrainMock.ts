import { Directive, EventEmitter, Input, Output, TemplateRef, ViewContainerRef, inject } from '@angular/core';

@Directive({ selector: '[brnButton]', standalone: true })
export class BrnButton {
  @Input() disabled: boolean | string | undefined;
}

@Directive({ selector: '[brnSheet]', standalone: true })
export class BrnSheet {}

@Directive({ selector: '[brnSheetOverlay]', standalone: true })
export class BrnSheetOverlay {}

@Directive({ selector: '[brnSheetTitle]', standalone: true })
export class BrnSheetTitle {}

@Directive({ selector: '[brnSheetContent]', standalone: true })
export class BrnSheetContent {}

@Directive({ selector: '[brnSheetClose]', standalone: true })
export class BrnSheetClose {}

@Directive({ selector: '[brnSheetDescription]', standalone: true })
export class BrnSheetDescription {}

@Directive({ selector: '[brnSheetTrigger]', standalone: true })
export class BrnSheetTrigger {}

@Directive({ selector: '[brnDialog],brn-dialog', standalone: true })
export class BrnDialog {
  // `HlmDialog extends BrnDialog`, so the declarative `[state]` / `(stateChanged)` bindings resolve
  // against THIS class. Without them Angular raises NG0303 on `<hlm-dialog [state]="…">`.
  @Input() state: 'open' | 'closed' | null | undefined;
  @Input() hasBackdrop: boolean | string | undefined;
  @Input() disableClose: boolean | string | undefined;
  @Input() autoFocus: string | boolean | undefined;
  @Input() restoreFocus: string | boolean | undefined;
  @Input() closeOnOutsidePointerEvents: boolean | string | undefined;
  @Output() readonly stateChanged = new EventEmitter<'open' | 'closed'>();
  @Output() readonly closed = new EventEmitter<unknown>();
}

@Directive({ selector: '[brnTooltip]', standalone: true })
export class BrnTooltip {}

export type BrnTooltipPosition = string;

@Directive({ selector: '[brnSeparator]', standalone: true })
export class BrnSeparator {}

export function provideBrnDialogDefaultOptions(_opts: any): any {
  return { provide: 'BrnDialogDefaultOptions', useValue: _opts };
}

export function provideBrnTooltipDefaultOptions(_opts: any): any {
  return { provide: 'BrnTooltipDefaultOptions', useValue: _opts };
}

export function injectCustomClassSettable(): any {
  // `setClassToCustomElement` is what Helm's overlay directives actually call
  // (hlm-dialog-overlay.ts:24). The original stub only had `setClass`, which threw.
  return { setClass: () => {}, setClassToCustomElement: () => {} };
}

export function injectExposedSideProvider(): any {
  return { side: () => 'right' };
}

export function injectExposesStateProvider(): any {
  return { state: () => 'closed' };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Command palette primitives (@spartan-ng/brain/command) — added for the global search palette.
//
// ⚠️ These are STUBS. They reproduce the selectors, inputs and outputs so templates compile and
// bindings can be asserted, but NOT the real behaviour: no `ActiveDescendantKeyManager`, no
// `data-selected`, no `visible()` filtering. Arrow-key navigation and activedescendant announcement
// are therefore NOT covered by Jest and must be verified in the browser.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

@Directive({ selector: '[brnCommand]', standalone: true })
export class BrnCommand {
  @Input() id: string | undefined;
  @Input() filter: ((value: string, search: string) => boolean) | undefined;
  @Input() search: string | undefined;
  @Input() disabled: boolean | string | undefined;
  // ⚠️ Keep this surface in step with every `keyManager` method the app calls. A missing method
  // throws inside a microtask, which under Jest surfaces as the whole suite HANGING rather than as
  // a failed assertion — `setFirstItemActive` was missing and stalled the full run for 7+ minutes.
  readonly keyManager = {
    activeItem: null as any,
    change: { subscribe: () => ({ unsubscribe: () => {} }) },
    onKeydown: () => {},
    setFirstItemActive: () => {},
    setLastItemActive: () => {},
    setActiveItem: () => {},
    setNextItemActive: () => {},
    setPreviousItemActive: () => {}
  };
}

@Directive({ selector: 'input[brnCommandInput]', standalone: true })
export class BrnCommandInput {
  @Input() id: string | undefined;
}

@Directive({ selector: '[brnCommandList]', standalone: true })
export class BrnCommandList {
  @Input() id: string | undefined;
}

@Directive({ selector: '[brnCommandGroup]', standalone: true })
export class BrnCommandGroup {
  @Input() id: string | undefined;
}

@Directive({ selector: 'button[brnCommandItem]', standalone: true })
export class BrnCommandItem {
  @Input() id: string | undefined;
  @Input() value: string | undefined;
  @Input() disabled: boolean | string | undefined;
}

@Directive({ selector: '[brnCommandEmpty]', standalone: true })
export class BrnCommandEmpty {}

@Directive({ selector: '[brnCommandSeparator]', standalone: true })
export class BrnCommandSeparator {}

export const BrnCommandImports = [
  BrnCommand,
  BrnCommandEmpty,
  BrnCommandGroup,
  BrnCommandInput,
  BrnCommandItem,
  BrnCommandList,
  BrnCommandSeparator
] as const;

// ── Remaining dialog surface the generated Helm dialog imports ────────────────────────────────────

export type BrnDialogState = 'closed' | 'open';
export type BrnDialogOptions = Record<string, unknown>;

@Directive({ selector: '[brnDialogOverlay]', standalone: true })
export class BrnDialogOverlay {}

@Directive({ selector: 'button[brnDialogClose]', standalone: true })
export class BrnDialogClose {}

@Directive({ selector: '[brnDialogTitle]', standalone: true })
export class BrnDialogTitle {}

@Directive({ selector: '[brnDialogDescription]', standalone: true })
export class BrnDialogDescription {}

@Directive({ selector: 'button[brnDialogTrigger]', standalone: true })
export class BrnDialogTrigger {}

/**
 * The real directive portals its template into a CDK overlay. Under Jest there is no overlay, so
 * this stub instantiates the template INLINE instead — otherwise `*hlmDialogPortal` content would
 * never render and no dialog-body markup could be asserted at all.
 */
@Directive({ selector: '[brnDialogContent]', standalone: true })
export class BrnDialogContent {
  @Input('class') className: string | null | undefined;
  @Input() context: Record<string, unknown> | undefined;

  private readonly _template = inject(TemplateRef, { optional: true });
  private readonly _viewContainer = inject(ViewContainerRef);

  constructor() {
    if (this._template) {
      this._viewContainer.createEmbeddedView(this._template, { $implicit: {} });
    }
  }
}

export class BrnDialogRef<T = unknown> {
  state = () => 'closed' as BrnDialogState;
  close(_result?: T): void {}
}

export function injectBrnDialogContext<T = unknown>(_opts?: { optional?: boolean }): T | null {
  return null;
}

export class BrnDialogService {
  open(..._args: unknown[]): BrnDialogRef {
    return new BrnDialogRef();
  }
}

export function cssClassesToArray(classes?: string): string[] {
  return (classes ?? '').split(' ').filter(Boolean);
}

@Directive({ selector: '[brnTextarea]', standalone: true })
export class BrnTextarea {}

@Directive({ selector: '[brnFieldControlDescribedBy]', standalone: true })
export class BrnFieldControlDescribedBy {}

// ── Field surface used by hlm-native-select ───────────────────────────────────────────────────────

@Directive({ selector: '[brnFieldControl]', standalone: true })
export class BrnFieldControl {
  readonly invalid = () => false;
  readonly touched = () => false;
  readonly dirty = () => false;
  readonly spartanInvalid = () => false;
}

export function provideBrnLabelable(_type: unknown): any {
  return { provide: 'BrnLabelable', useValue: _type };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Tabs primitives (@spartan-ng/brain/tabs) — added for segmented and browse tabs.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export type BrnTabsOrientation = 'horizontal' | 'vertical';
export type BrnTabsDirection = 'ltr' | 'rtl';
export type BrnActivationMode = 'automatic' | 'manual';

@Directive({ selector: '[brnTabs]', standalone: true })
export class BrnTabs {
  @Input('brnTabs') activeTab: string | undefined;
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
  @Output() readonly brnTabsChange = new EventEmitter<string>();
  @Output() readonly tabActivated = new EventEmitter<string>();

  /** Mirrors the real brain: activates a tab and emits both outputs. */
  setActiveTab(key: string): void {
    if (this.activeTab === key) return;
    this.activeTab = key;
    this.brnTabsChange.emit(key);
    this.tabActivated.emit(key);
  }
}

@Directive({
  selector: '[brnTabsList]',
  standalone: true,
  host: {
    role: 'tablist',
    '[attr.aria-orientation]': 'orientation'
  }
})
export class BrnTabsList {
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
}

@Directive({
  selector: 'button[brnTabsTrigger],[brnTabsTrigger]',
  standalone: true,
  host: {
    role: 'tab',
    '[attr.aria-selected]': 'selected',
    '[attr.aria-controls]': 'triggerFor',
    '[attr.data-state]': "selected ? 'active' : 'inactive'",
    '[attr.tabindex]': "selected ? '0' : '-1'",
    '[attr.disabled]': "disabled ? '' : null",
    '[disabled]': 'disabled',
    '(click)': 'activate()'
  }
})
export class BrnTabsTrigger {
  private readonly _parent = inject(BrnTabs, { optional: true });
  @Input('brnTabsTrigger') triggerFor: string = '';
  @Input() disabled: boolean = false;
  get selected(): boolean {
    return this._parent ? this._parent.activeTab === this.triggerFor : false;
  }
  activate(): void {
    if (this.disabled) return;
    this._parent?.setActiveTab(this.triggerFor);
  }
}

@Directive({
  selector: '[brnTabsContent]',
  standalone: true,
  host: {
    role: 'tabpanel',
    '[attr.tabindex]': '0',
    '[attr.aria-labelledby]': 'contentFor',
    '[hidden]': '!selected'
  }
})
export class BrnTabsContent {
  private readonly _parent = inject(BrnTabs, { optional: true });
  @Input('brnTabsContent') contentFor: string = '';
  get selected(): boolean {
    return this._parent ? this._parent.activeTab === this.contentFor : true;
  }
}

@Directive({ selector: 'ng-template[brnTabsContentLazy]', standalone: true })
export class BrnTabsContentLazy {}

export abstract class BrnTabsPaginatedList {}

export const BrnTabsImports = [
  BrnTabs,
  BrnTabsList,
  BrnTabsTrigger,
  BrnTabsContent,
  BrnTabsContentLazy
] as const;


