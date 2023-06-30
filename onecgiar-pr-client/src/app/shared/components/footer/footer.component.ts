import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  routes = [{ path: '/result/results-outlet/results-list' }, { path: '/result/result-detail/', floating: true }];
  isFloating = false;
  isHover = false;
  constructor(private router: Router) {}
  showIfRouteIsInList() {
    // console.log(this.router.url);
    this.isFloating = false;
    for (const route of this.routes) {
      if (this.router.url.includes(route?.path)) {
        this.isFloating = route.floating;
        return true;
      }
    }
    return false;
  }
}
