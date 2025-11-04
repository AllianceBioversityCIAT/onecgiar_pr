import { Component, OnInit, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ClarityService } from '../../services/clarity.service';

type ConsentValue = 'accepted' | 'rejected';

@Component({
  selector: 'app-cookies-dialog',
  imports: [DialogModule, ButtonModule],
  templateUrl: './cookies-dialog.component.html',
  styleUrl: './cookies-dialog.component.scss'
})
export class CookiesDialogComponent implements OnInit {
  private readonly CONSENT_KEY = 'cookieConsent';
  visible: boolean = true;

  position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'bottomright';

  private readonly clarity = inject(ClarityService);

  ngOnInit(): void {
    const saved = localStorage.getItem(this.CONSENT_KEY) as ConsentValue | null;

    if (saved === 'accepted') {
      this.applyConsent(true);
      this.visible = false;
      return;
    }

    if (saved === 'rejected') {
      this.applyConsent(false);
      this.visible = false;
      return;
    }

    this.applyConsent(false);
    this.visible = true;
  }

  showDialog(position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright') {
    this.position = position;
    this.visible = true;
  }

  acceptAll(): void {
    localStorage.setItem(this.CONSENT_KEY, 'accepted');
    this.applyConsent(true);
    this.visible = false;
  }

  rejectAll(): void {
    localStorage.setItem(this.CONSENT_KEY, 'rejected');
    this.applyConsent(false);
    this.visible = false;
  }

  private applyConsent(granted: boolean): void {
    try {
      this.clarity.setCookieConsent(granted);
      globalThis.clarity('consentv2', {
        ad_Storage: granted ? 'granted' : 'denied',
        analytics_Storage: granted ? 'granted' : 'denied'
      });
    } catch {}
  }
}
