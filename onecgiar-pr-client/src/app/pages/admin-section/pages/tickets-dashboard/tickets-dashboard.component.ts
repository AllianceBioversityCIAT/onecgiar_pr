import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-tickets-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './tickets-dashboard.component.html',
  styleUrl: './tickets-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketsDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  ticketsDashboardUrl: SafeResourceUrl = null;
  @ViewChild('dashboardIframe') iframeElement: ElementRef;
  iframeHeight: string;

  globalLinksSE = inject(GlobalLinksService);
  sanitizer = inject(DomSanitizer);
  cdr = inject(ChangeDetectorRef);

  private resizeListener: () => void;

  ngOnInit() {
    this.sanitizeUrl();
    this.setAdaptiveHeight();
  }

  ngAfterViewInit() {
    window.addEventListener('message', this.handleFrameMessage);

    this.resizeListener = () => this.setAdaptiveHeight();
    window.addEventListener('resize', this.resizeListener);

    if (this.iframeElement?.nativeElement) {
      this.iframeElement.nativeElement.onload = () => {
        setTimeout(() => {
          this.setAdaptiveHeight();
          this.tryAdjustIframeHeight();
        }, 800);
      };
    }
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.handleFrameMessage);
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  handleFrameMessage = event => {
    if (event.data && event.data.type === 'resize' && event.data.height) {
      this.iframeHeight = `${event.data.height}px`;
      this.cdr.detectChanges();
    }
  };

  setAdaptiveHeight() {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (viewportWidth < 768) {
      this.iframeHeight = `${viewportHeight * 2}px`;
    } else if (viewportWidth < 1700) {
      this.iframeHeight = `${viewportHeight * 2.4}px`;
    } else {
      this.iframeHeight = '2200px';
    }

    this.cdr.detectChanges();
  }

  tryAdjustIframeHeight() {
    try {
      this.adjustIframeHeight();
    } catch (e) {
      console.log('Error adjusting iframe height:', e);
      throw e;
    }
  }

  adjustIframeHeight() {
    try {
      const iframe = this.iframeElement.nativeElement;
      const iframeWin = iframe.contentWindow || iframe.contentDocument.parentWindow;
      if (iframeWin.document.body) {
        const height = iframeWin.document.documentElement.scrollHeight || iframeWin.document.body.scrollHeight;

        if (height > 300) {
          this.iframeHeight = `${height}px`;
          this.cdr.detectChanges();
        }
      }
    } catch (e) {
      console.error('Error adjusting iframe height:', e);
      throw e;
    }
  }

  sanitizeUrl() {
    if (!this.globalLinksSE?.links?.url_t1r_bi_report) {
      return;
    }

    const url = `${this.globalLinksSE?.links?.url_prms_tickets_dashboards}`;
    this.ticketsDashboardUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
