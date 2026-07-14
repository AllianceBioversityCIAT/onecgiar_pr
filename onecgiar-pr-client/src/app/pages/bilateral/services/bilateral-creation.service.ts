import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { environment } from '../../../../environments/environment';

const LS_PROJECT_KEY = 'bp_project';
const LS_SP_KEY = 'bp_primary_sp';
const LS_SECONDARY_SP_KEY = 'bp_secondary_sps';

@Injectable({ providedIn: 'root' })
export class BilateralCreationService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  projects = signal<BilateralProject[]>([]);
  selectedProject = signal<BilateralProject | null>(this.loadFromStorage<BilateralProject>(LS_PROJECT_KEY));
  selectedPrimarySp = signal<{ programId: number; programCode: string; allocation: string } | null>(
    this.loadFromStorage(LS_SP_KEY)
  );
  selectedSecondarySps = signal<{ programId: number; programCode: string; allocation: string }[]>(
    this.loadFromStorage(LS_SECONDARY_SP_KEY) ?? []
  );

  currentResultId = signal<number | null>(null);
  isLoadingProjects = signal(false);
  resultTitle = signal('');
  resultDescription = signal('');

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

  loadResult(resultId: number): void {
    this.currentResultId.set(resultId);
    this.http.get<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}`).subscribe({
      next: ({ response }) => {
        if (response?.commonFields) {
          this.resultTitle.set(response.commonFields.result_title ?? '');
          this.resultDescription.set(response.commonFields.result_description ?? '');
        }
      },
      error: () => { /* result may not exist yet */ }
    });
  }

  selectProject(project: BilateralProject): void {
    this.selectedProject.set(project);
    this.selectedPrimarySp.set(null);
    this.selectedSecondarySps.set([]);
    this.saveToStorage(LS_PROJECT_KEY, project);
    localStorage.removeItem(LS_SP_KEY);
    localStorage.removeItem(LS_SECONDARY_SP_KEY);
  }

  selectPrimarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    this.selectedPrimarySp.set(sp);
    this.saveToStorage(LS_SP_KEY, sp);
  }

  toggleSecondarySp(sp: { programId: number; programCode: string; allocation: string }): void {
    const current = this.selectedSecondarySps();
    const existing = current.find(s => s.programId === sp.programId);
    if (existing) {
      const next = current.filter(s => s.programId !== sp.programId);
      this.selectedSecondarySps.set(next);
      this.saveToStorage(LS_SECONDARY_SP_KEY, next);
    } else {
      const next = [...current, sp];
      this.selectedSecondarySps.set(next);
      this.saveToStorage(LS_SECONDARY_SP_KEY, next);
    }
  }

  createResult(resultLevelId: number, resultTypeId: number): Observable<any> {
    const body = {
      result_level_id: resultLevelId,
      result_type_id: resultTypeId,
    };
    return this.http.post(`${environment.apiBaseUrl}api/bilateral/center/create-header`, body);
  }

  submitResult(resultId: number): Observable<any> {
    return this.http.patch(
      `${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`,
      { decision: 'APPROVE', justification: 'Submitted by Center User' }
    );
  }

  private saveToStorage<T>(key: string, value: T): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }

  private loadFromStorage<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
