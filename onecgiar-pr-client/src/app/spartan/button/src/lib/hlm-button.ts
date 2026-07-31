import { Directive, computed, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { hlm } from '@spartan/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

export const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 data-[matches-spartan-invalid=true]:ring-destructive/20 dark:data-[matches-spartan-invalid=true]:ring-destructive/40 data-[matches-spartan-invalid=true]:border-destructive dark:data-[matches-spartan-invalid=true]:border-destructive/50 rounded-md border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px data-[matches-spartan-invalid=true]:ring-3 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(4)] group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0",
  {
    variants: {
      variant: {
        // WCAG fix — was `hover:bg-primary/80`. Tailwind compiles `/80` to
        // color-mix(in oklab, var(--primary) 80%, transparent), i.e. the primary composited over
        // whatever is BEHIND the button, not a darker stop. With --primary #6b46e5 that lands on
        // ~#896bea, where white text measures 3.9217:1 over white / 4.0173:1 over the #f7f7f9
        // canvas — both fail AA for normal text, on every default button in the app.
        // The explicit 400 stop gives 7.8479:1 and matches the `brand` variant below.
        default: 'bg-primary text-primary-foreground hover:bg-brand-400',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground shadow-xs',
        secondary:
          'bg-secondary text-secondary-foreground aria-expanded:bg-secondary aria-expanded:text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
        ghost: 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive:
          'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        link: 'text-primary underline-offset-4 hover:underline',
        // ── PRMS redesign variants — docs/reporting-redesign/UI-RULES.md §3.3.
        // `brand` is THE single primary action per screen (rule 1). white on #6b46e5 = 5.7809:1,
        // hover #5733c4 = 7.8479:1.
        brand: 'bg-brand-300 text-white hover:bg-brand-400 shadow-[var(--pr-shadow-1)]',
        // `brandSoft` is for row-level actions (Report / Continue). Border is the light tint, which
        // is fine here because the FILL carries the affordance and the label is #5733c4 on #ffffff
        // (7.8479:1) / on #f5f3ff (7.1583:1).
        brandSoft: 'bg-white border border-brand-200 text-brand-400 hover:bg-brand-50'
      },
      size: {
        default: 'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3)]",
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_ng-icon:not([class*='text-'])]:text-[length:--spacing(3)]",
        'icon-sm': 'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md',
        'icon-lg': 'size-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
  selector: 'button[hlmBtn], a[hlmBtn]',
  exportAs: 'hlmBtn',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: {
    'data-slot': 'button',
    '[class]': '_computedClass()'
  }
})
export class HlmButton {
  private readonly _config = injectBrnButtonConfig();

  private readonly _additionalClasses = signal<ClassValue>('');

  public readonly variant = input<ButtonVariants['variant']>(this._config.variant);

  public readonly size = input<ButtonVariants['size']>(this._config.size);

  // Static host [class] binding instead of the reactive classes() util: classes()
  // installs a document-wide MutationObserver that, on class-heavy pages (p-table),
  // drives an infinite change-detection loop (same issue that froze hlmInput, fix 64d68f283).
  protected readonly _computedClass = computed(() =>
    hlm(buttonVariants({ variant: this.variant(), size: this.size() }), this._additionalClasses())
  );

  setClass(classes: string): void {
    this._additionalClasses.set(classes);
  }
}
