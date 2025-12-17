import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class IpsrContributorsService {
  clarisaProjectsList: any[] = [];
  api = inject(ApiService);

  constructor() {
    this.loadClarisaProjects();
  }

  loadClarisaProjects() {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        this.clarisaProjectsList = response;
        response.forEach(project => {
          project.project_id = project.id;
        });
      },
      error: err => {
        console.error('Error loading Clarisa projects:', err);
      }
    });
  }
}
