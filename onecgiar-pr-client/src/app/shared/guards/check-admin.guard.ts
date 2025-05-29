import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CheckAdminGuard {
  constructor(
    private readonly router: Router,
    private readonly authSE: AuthService
  ) {}

  async canActivate() {
    const isAdmin = new Promise((resolve, reject) => {
      this.authSE.GET_allRolesByUser().subscribe({
        next: ({ response }) => {
          resolve(response?.application?.role_id == 1);
        },
        error: err => {
          console.error(err);
          reject(new Error('Failed to get user roles'));
        }
      });
    });

    if (await isAdmin) return true;
    this.router.navigate(['/result/results-outlet/results-list']);
    return false;
  }
}
