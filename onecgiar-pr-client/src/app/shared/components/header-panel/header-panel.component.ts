import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalizationData';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { TawkComponent } from '../tawk/tawk.component';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-panel',
  standalone: true,
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss'],
  imports: [CommonModule, TawkComponent, PrButtonComponent, RouterLink]
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;
  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public globalLinksSE: GlobalLinksService
  ) {}
  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }

  openInfoLink() {
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;

    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const url = this.globalLinksSE.links.url_platform_information;

    window.open(
      url,
      'Information center',
      `left=${left},top=${top},width=${w},height=${h}`
    );
  }
}
