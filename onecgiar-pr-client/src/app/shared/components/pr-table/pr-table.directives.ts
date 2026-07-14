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
