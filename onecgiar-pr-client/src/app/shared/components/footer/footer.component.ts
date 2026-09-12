import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CLARISA_GLOSSARY_URL } from '../../constants/clarisa-links.constants';
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
  /** P2-3145 — shared with sidebar EXTRAS; see `clarisa-links.constants`. */
  glossary = CLARISA_GLOSSARY_URL;

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
