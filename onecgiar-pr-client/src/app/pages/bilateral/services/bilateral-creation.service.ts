import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BilateralCreationService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  projects = signal<BilateralProject[]>([]);
  selectedProject = signal<BilateralProject | null>(null);
  selectedPrimarySp = signal<{ programId: number; programCode: string; allocation: string } | null>(null);
  selectedSecondarySps = signal<{ programId: number; programCode: string; allocation: string }[]>([]);

  currentResultId = signal<number | null>(null);
  isLoadingProjects = signal(false);

  getProjects(centerId: string | number): void {
    this.isLoadingProjects.set(true);
    this.api.resultsSE.GET_bilateralProjects(centerId).subscribe({
      next: ({ response }) => {
        this.projects.set(response.projects);
        this.isLoadingProjects.set(false);
      },
      error: () => this.isLoadingProjects.set(false)
    });
  }

  loadResult(_resultId: number): void {

  }

  selectProject(project: BilateralProject): void {
    this.selectedProject.set(project);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
  }

  selectPrimarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    this.selectedPrimarySp.set(sp);
  }

  toggleSecondarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    const current = this.selectedSecondarySps();
    const existing = current.find(s => s.programId === sp.programId);
    if (existing) {
      this.selectedSecondarySps.set(current.filter(s => s.programId !== sp.programId));
    } else {
      this.selectedSecondarySps.set([...current, sp]);
    }
  }

  createResult(resultLevelId: number, resultTypeId: number): Observable<any> {
    const body = {
      result_level_id: resultLevelId,
      result_type_id: resultTypeId,
      source: 'API' as const,
      status_id: 1,
      title: '',
      description: '',
    };
    return this.http.post(`${environment.apiBaseUrl}api/results/create`, body);
  }

  submitResult(resultId: number): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`,
      { decision: 'APPROVE', justification: 'Submitted by Center User' }
    );
  }
}
