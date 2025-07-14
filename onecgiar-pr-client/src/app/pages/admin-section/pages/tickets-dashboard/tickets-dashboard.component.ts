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
import { LoggerService } from '../../../../shared/services/logger.service';

@Component({
    selector: 'app-tickets-dashboard',
    imports: [],
    templateUrl: './tickets-dashboard.component.html',
    styleUrls: ['./tickets-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketsDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  ticketsDashboardUrl: SafeResourceUrl = null;
  @ViewChild('dashboardIframe') iframeElement: ElementRef;
  iframeHeight: string;

  globalLinksSE = inject(GlobalLinksService);
  sanitizer = inject(DomSanitizer);
  cdr = inject(ChangeDetectorRef);
  private readonly logger = inject(LoggerService);

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
      this.logger.error('Error ajustando altura del iframe', e);
    }
  }

  adjustIframeHeight() {
    try {
      const iframe = this.iframeElement.nativeElement;
      const iframeWin = iframe.contentWindow ?? iframe.contentDocument.parentWindow;
      if (iframeWin.document.body) {
        const height = iframeWin.document.documentElement.scrollHeight ?? iframeWin.document.body.scrollHeight;

        if (height > 300) {
          this.iframeHeight = `${height}px`;
          this.cdr.detectChanges();
        }
      }
    } catch (e) {
      this.logger.error('Error accediendo al contenido del iframe', e);
    }
  }

  sanitizeUrl() {
    if (!this.globalLinksSE?.links?.url_prms_tickets_dashboards) {
      return;
    }

    const url = `${this.globalLinksSE?.links?.url_prms_tickets_dashboards}`;
    this.ticketsDashboardUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
