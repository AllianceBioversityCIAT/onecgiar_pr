import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ClarityService } from '../../services/clarity.service';

@Component({
  selector: 'app-cookies-dialog',
  imports: [DialogModule, ButtonModule],
  templateUrl: './cookies-dialog.component.html',
  styleUrl: './cookies-dialog.component.scss'
})
export class CookiesDialogComponent {
  visible: boolean = true;

  position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'bottomright';

  private readonly clarity = inject(ClarityService);

  showDialog(position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright') {
    this.position = position;
    this.visible = true;
  }

  acceptAll(): void {
    try {
      this.clarity.setCookieConsent(true);
      globalThis.clarity('consentv2', {
        ad_Storage: 'granted',
        analytics_Storage: 'granted'
      });
    } catch {}
    this.visible = false;
  }

  rejectAll(): void {
    try {
      this.clarity.setCookieConsent(false);
      globalThis.clarity('consentv2', {
        ad_Storage: 'denied',
        analytics_Storage: 'denied'
      });
    } catch {}
    this.visible = false;
  }
}
