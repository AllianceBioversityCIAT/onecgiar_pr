import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { RolesService } from '../services/global/roles.service';
import { AuthService } from '../services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CheckAdminGuard  {
  constructor(private rolesSE: RolesService, private router: Router, private authSE: AuthService) {}

  async canActivate() {
    const isAdmin = new Promise((resolve, reject) => {
      this.authSE.GET_allRolesByUser().subscribe(
        ({ response }) => {
          //? Update role list
          resolve(response?.application?.role_id == 1);
        },
        err => {
          console.error(err);
          reject(false);
        }
      );
    });

    if (await isAdmin) return true;
    this.router.navigate(['/result/results-outlet/results-list']);
    return false;
  }
}
