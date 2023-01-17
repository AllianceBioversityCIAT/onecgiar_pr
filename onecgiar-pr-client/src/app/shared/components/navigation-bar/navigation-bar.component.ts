import { Component, OnInit } from '@angular/core';
import { PrRoute, routingApp } from '../../routing/routing-data';
import { NavigationBarService } from '../../services/navigation-bar.service';
import { RolesService } from '../../services/global/roles.service';

@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit {
  navigationOptions: PrRoute[] = routingApp;
  constructor(public _navigationBarService: NavigationBarService, private rolesSE: RolesService) {}

  ngOnInit(): void {
    window.addEventListener('scroll', e => {
      let scrollTopValue: any = window.pageYOffset || ((document.documentElement || document.body.parentNode || document.body) as any).scrollTop;
      if (scrollTopValue > 70) {
        this._navigationBarService.navbar_fixed = true;
      } else {
        this._navigationBarService.navbar_fixed = false;
      }
    });
  }

  validateAdminModuleAndRole(path) {
    // console.log(path);
    // console.log(this.rolesSE.isAdmin);
    if (path != 'admin-module') return false;
    if (this.rolesSE.isAdmin) return false;
    return true;
  }
}
