import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { map, Observable, take } from 'rxjs';
import { AuthService } from '../services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CheckLoginGuard  {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate() {
    if (this.authService.localStorageToken) return true;
    this.router.navigate(['/login']);
    return false;
  }
}
