import { Directive, effect, inject, input } from '@angular/core';
import { classes } from '@spartan/utils';
import { HlmSidebarService } from './hlm-sidebar.service';
import { injectHlmSidebarConfig } from './hlm-sidebar.token';

@Directive({
  selector: '[hlmSidebarWrapper],hlm-sidebar-wrapper',
  host: {
    'data-slot': 'sidebar-wrapper',
    '[style.--sidebar-width]': 'sidebarService.sidebarWidthCss()',
    '[style.--sidebar-width-icon]': 'sidebarWidthIcon()'
  }
})
export class HlmSidebarWrapper {
  private readonly _config = injectHlmSidebarConfig();
  protected readonly sidebarService = inject(HlmSidebarService);

  public readonly sidebarWidth = input<string>(this._config.sidebarWidth);
  public readonly sidebarWidthIcon = input<string>(this._config.sidebarWidthIcon);

  constructor() {
    effect(() => {
      this.sidebarService.applyDefaultWidthFromCss(this.sidebarWidth());
    });

    classes(() => 'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full');
  }
}
