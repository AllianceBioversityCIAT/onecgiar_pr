import { Injectable, inject, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';

/**
 * Holds the floating PDF-export action so it can live INSIDE the save-button's
 * fixed container (PDF + Save grouped), while the actual host page (result-detail)
 * owns the link. Enabled only while a result-detail page is active.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly clipboard = inject(Clipboard);
  private readonly messageSE = inject(MessageService);

  /** Whether the PDF export button should be shown (set by the host page). */
  readonly enabled = signal(false);
  /** Dropdown open state. */
  readonly menuOpen = signal(false);
  /** Full PDF link, set by the host page once the result is loaded. */
  readonly link = signal<string>('');

  toggle(): void {
    this.menuOpen.update(open => !open);
  }

  close(): void {
    this.menuOpen.set(false);
  }

  view(): void {
    const url = this.link();
    if (url) window.open(url, '_blank');
    this.close();
  }

  copy(): void {
    this.clipboard.copy(this.link());
    this.messageSE.add({ key: 'copyResultLinkPdf', severity: 'success', summary: 'PDF link copied' });
    this.close();
  }

  /** Reset on leaving the host page. */
  disable(): void {
    this.enabled.set(false);
    this.menuOpen.set(false);
    this.link.set('');
  }
}
