import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CheckLoginGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(_route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot) {
    if (this.authService.localStorageToken) return true;

    // Remember where the user was heading so login can put them back there
    // (CLAUDE.md §7: "Login redirects MUST return users to their original deep link").
    this.authService.pendingRedirectUrl = state?.url ?? null;
    this.router.navigate(['/login']);
    return false;
  }
}
