import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalization-data';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';
import { environment } from '../../../../environments/environment';
import { GlobalLinksService } from '../../services/variables/global-links.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  inLocal = (environment as any)?.inLocal;
  mockNotifications = [
    {
      init: 'INIT-17',
      message: '<b>Stewie Griffin submitted the result</b> 6172-The CGIAR Climate Security Observatory (CSO)',
      date: new Date(new Date().setMinutes(new Date().getMinutes() - 3))
    },
    {
      init: 'INIT-28',
      message:
        '<b>Jane Cole from INIT-10 has requested to include INIT-04 as a contributor</b> to result 1050 - Manhat, a participant in the F2R-CWANA Agritech4Morocco Innovation Challenge 2022, was one named in the UAE government\'s "Future 100" list for 2023',
      date: new Date(new Date().setDate(new Date().getDate() - 2))
    },
    {
      init: 'INIT-17',
      message:
        '<b>Mohan Rao from INIT-08 has requested the inclusion of INIT-17 as a contributor</b> to result 7535-Natural regeneration of severely degraded terrestrial arid ecosystems needs more than just removing the cause of the degradation',
      date: new Date(new Date().setDate(new Date().getDate() - 3))
    }
  ];

  constructor(public api: ApiService, public dataControlSE: DataControlService, public globalLinksSE: GlobalLinksService, private router: Router) {}

  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }

  openInfoLink() {
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;

    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const url = this.globalLinksSE.links.url_platform_information;

    window.open(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);
  }

  goToNotifications() {
    this.router.navigate(['result/results-outlet/results-notifications/requests']);
  }
}
