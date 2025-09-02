import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { FooterService } from './footer.service';
import { GlobalLinksService } from '../../services/variables/global-links.service';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    standalone: false
})
export class FooterComponent {
  routes = [{ path: '/result/results-outlet/results-list' }, { path: '/result/result-detail/', floating: true }, { path: '/type-one-report', floating: true }, { path: '/ipsr/list/innovation-list' }, { path: '/ipsr/detail' }, { path: '/quality-assurance' }, { path: '/init-admin-module', floating: true }, { path: '/login', floatingFix: true }];
  isFloating = false;
  isFloatingFix = false;
  isHover = false;
  license = environment.footerUrls.license;

  constructor(public router: Router, public footerSE: FooterService, public globalLinksSE:GlobalLinksService) {}

  showIfRouteIsInList() {
    this.isFloating = false;
    for (const route of this.routes) {
      if (this.router.url.includes(route?.path)) {
        this.isFloating = route.floating;
        this.isFloatingFix = route.floatingFix;
        return true;
      }
    }
    return false;
  }

  onMouseEnter() {
    this.isHover = true;
  }

  onMouseLeave() {
    this.isHover = false;
  }
}
