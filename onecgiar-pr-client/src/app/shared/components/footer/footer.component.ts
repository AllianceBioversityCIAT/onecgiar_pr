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
  routes = [
    { path: '/result/results-outlet/results-list' },
    { path: '/type-one-report', floating: true },
    { path: '/ipsr/list/innovation-list' },
    { path: '/ipsr/detail' },
    { path: '/quality-assurance' },
    { path: '/init-admin-module', floating: true },
    { path: '/login', floatingFix: true }
  ];
  isFloating = false;
  isFloatingFix = false;
  isHover = false;
  license = environment.footerUrls.license;
  /**
   * P2-3145: public CLARISA glossary, the single place where CGIAR reporting terms are
   * defined. Hardcoded rather than read from `environment.footerUrls` because those files
   * are gitignored and generated per deployment, so a key added here would never reach the
   * servers. The URL is public and the same in every environment. If it ever needs to change
   * without a release, it belongs in the platform global variables like Terms and Conditions.
   */
  glossary = 'https://clarisa.cgiar.org/landing-page/glossary';

  constructor(
    public router: Router,
    public footerSE: FooterService,
    public globalLinksSE: GlobalLinksService
  ) {}

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

  getYear() {
    return new Date().getFullYear();
  }

  onMouseEnter() {
    this.isHover = true;
  }

  onMouseLeave() {
    this.isHover = false;
  }
}
