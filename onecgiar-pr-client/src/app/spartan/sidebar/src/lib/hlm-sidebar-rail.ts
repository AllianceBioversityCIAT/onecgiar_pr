import { Directive, HostListener, inject, input } from '@angular/core';
import { classes } from '@spartan/utils';
import { HlmSidebarService } from './hlm-sidebar.service';

@Directive({
  selector: 'button[hlmSidebarRail]',
  host: {
    'data-sidebar': 'rail',
    'data-slot': 'sidebar-rail',
    '[attr.aria-label]': 'ariaLabel()',
    tabindex: '-1'
  }
})
export class HlmSidebarRail {
  private readonly _sidebarService = inject(HlmSidebarService);

  public readonly ariaLabel = input<string>('Toggle Sidebar', { alias: 'aria-label' });

  constructor() {
    classes(() => [
      'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2',
      'in-data-[side=left]:cursor-col-resize in-data-[side=right]:cursor-col-resize',
      '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
      'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
      '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
      '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2'
    ]);
  }

  @HostListener('click', ['$event'])
  protected onClick(event: MouseEvent): void {
    if (this._sidebarService.consumeRailToggleSuppression()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this._sidebarService.toggleSidebar();
  }

  @HostListener('pointerdown', ['$event'])
  protected onPointerDown(event: PointerEvent): void {
    if (this._sidebarService.isMobile() || this._sidebarService.state() !== 'expanded') return;
    this._sidebarService.startWidthResize(event);
  }

  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this._sidebarService.isMobile() || this._sidebarService.state() !== 'expanded') return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this._sidebarService.adjustWidthPx(event.shiftKey ? 20 : 8);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this._sidebarService.adjustWidthPx(event.shiftKey ? -20 : -8);
    }
  }
}
