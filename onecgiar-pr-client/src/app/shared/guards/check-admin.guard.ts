import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RolesService } from '../services/global/roles.service';

@Injectable({
  providedIn: 'root'
})
export class CheckAdminGuard implements CanActivate {
  constructor(private rolesSE: RolesService, private router: Router) {}

  canActivate() {
    console.log(this.rolesSE.isAdmin);
    if (this.rolesSE.isAdmin) return true;
    this.router.navigate(['/result/results-outlet/results-list']);
    return false;
  }
}
