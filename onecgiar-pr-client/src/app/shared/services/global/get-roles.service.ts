import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class GetRolesService {
  roles = signal<any[]>([]);
  api = inject(ApiService);

  constructor() {
    this.getRoles();
  }

  getRoles() {
    this.api.resultsSE.GET_roles().subscribe(roles => {
      this.roles.set(roles.response);
    });
  }
}
