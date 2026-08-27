import { EventEmitter, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { CenterDto } from '../../interfaces/center.dto';

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  /**
   * Legacy plain-array view of the CLARISA centers catalogue. Kept as-is: ~25 screens read it directly from
   * their templates or imperatively, and none of them should change behaviour because of P2-3190.
   */
  centersList: CenterDto[] = [];

  /**
   * P2-3190: signal-backed view of the SAME catalogue, written together with `centersList`.
   *
   * The catalogue resolves asynchronously, so any `computed()` that reads the plain array caches whatever
   * was there on its first evaluation and never recomputes when the HTTP response lands (a plain array is
   * not a reactive dependency). Under zoneless change detection nothing rescues it either. Consumers that
   * need the list to rebuild when the catalogue arrives must read `centers()` instead of `centersList`.
   *
   * Mirrors the migration already accepted in `InitiativesService` (`allInitiativesList` + `allInitiatives`).
   */
  readonly centers = signal<CenterDto[]>([]);

  loadedCenters: EventEmitter<boolean> = new EventEmitter();

  constructor(private api: ApiService) {
    this.getData();
  }

  async getData(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.centersList?.length) return resolve(JSON.parse(JSON.stringify(this.centersList)));
      this.api.resultsSE?.GET_AllCLARISACenters()?.subscribe({
        next: ({ response }) => {
          resolve([...response]);
          this.centersList = response;
          this.centers.set(response ?? []);
          this.loadedCenters.emit(true);
        },
        error: err => {
          reject(err);
        }
      });
    });
  }
}
