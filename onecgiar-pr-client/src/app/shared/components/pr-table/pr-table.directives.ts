import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Structural directives that mirror PrimeNG's `<ng-template pTemplate="...">`
 * slots so migrating a `<p-table>` to `<app-pr-table>` is close to 1:1:
 *
 *   <ng-template pTemplate="header">      → <ng-template prTableHeader>
 *   <ng-template pTemplate="body" let-row>→ <ng-template prTableBody let-row let-i="index">
 *   <ng-template pTemplate="emptymessage">→ <ng-template prTableEmpty>
 *
 * The body template receives `$implicit` = row and `index` = row index.
 */
@Directive({ selector: '[prTableHeader]', standalone: true })
export class PrTableHeaderDirective {
  readonly tpl = inject<TemplateRef<unknown>>(TemplateRef);
}

@Directive({ selector: '[prTableBody]', standalone: true })
export class PrTableBodyDirective {
  readonly tpl = inject<TemplateRef<{ $implicit: unknown; index: number; rowIndex: number }>>(TemplateRef);
}

@Directive({ selector: '[prTableEmpty]', standalone: true })
export class PrTableEmptyDirective {
  readonly tpl = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * prTableLoading — mirrors PrimeNG `<ng-template pTemplate="loadingbody">`.
 * Rendered in place of the body/empty state while the table `[loading]` is true.
 */
@Directive({ selector: '[prTableLoading]', standalone: true })
export class PrTableLoadingDirective {
  readonly tpl = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * prTableGroupHeader — mirrors PrimeNG `<ng-template pTemplate="groupheader" let-item let-expanded="expanded">`
 * for app-pr-group-table. Context: `$implicit` = group item, `expanded` = boolean, `rowIndex` = index.
 */
@Directive({ selector: '[prTableGroupHeader]', standalone: true })
export class PrTableGroupHeaderDirective {
  readonly tpl = inject<TemplateRef<{ $implicit: unknown; expanded: boolean; rowIndex: number }>>(TemplateRef);
}

/**
 * prTableExpandedRow — mirrors PrimeNG `<ng-template pTemplate="expandedrow" let-item>` (or the
 * template-ref `#expandedrow`) for app-pr-group-table. Rendered under a group header when expanded.
 * Context: `$implicit` = group item.
 */
@Directive({ selector: '[prTableExpandedRow]', standalone: true })
export class PrTableExpandedRowDirective {
  readonly tpl = inject<TemplateRef<{ $implicit: unknown }>>(TemplateRef);
}
