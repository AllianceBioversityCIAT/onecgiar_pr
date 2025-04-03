import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-tickets-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './tickets-dashboard.component.html',
  styleUrl: './tickets-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketsDashboardComponent implements OnInit {
  ticketsDashboardUrl = null;

  globalLinksSE = inject(GlobalLinksService);
  sanitizer = inject(DomSanitizer);

  ngOnInit() {
    this.sanitizeUrl();
  }

  sanitizeUrl() {
    if (!this.globalLinksSE?.links?.url_t1r_bi_report) {
      return;
    }

    const url = `${this.globalLinksSE?.links?.url_prms_tickets_dashboards}`;

    this.ticketsDashboardUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
