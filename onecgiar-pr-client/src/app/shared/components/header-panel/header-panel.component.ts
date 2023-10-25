import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalizationData';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;
  constructor(public api: ApiService, public dataControlSE: DataControlService) {}
  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }

  openInfoLink() {
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;

    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;

    const url = `https://cgiar-prms.notion.site/User-Roles-for-PRMS-Reporting-Tool-a105042c2a564147b08f8c734adc106c`;

    window.open(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);
  }
}
