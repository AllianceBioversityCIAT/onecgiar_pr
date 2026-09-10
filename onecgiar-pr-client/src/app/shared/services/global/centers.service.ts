import { EventEmitter, Injectable, signal } from '@angular/core';
import { defer, map, retry, throwError, timer } from 'rxjs';
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

  /**
   * P2-3554: extra attempts for the catalogue request, and the pause between them.
   *
   * This service used to fire the request EXACTLY ONCE, at app bootstrap, with no retry and no way back:
   * a single failed (or empty) response left `centersList`/`centers()` empty for the whole session, so every
   * CGIAR-centers dropdown in the app — including the mandatory "Lead center" — rendered "No information
   * found" until the user reloaded the page. That is indistinguishable on screen from "there are no
   * centers", which is what made P2-3554 read as a permanently broken field. Reproduced against the live
   * environment by answering `clarisa/centers/get/all` with one 503: the dropdown showed
   * "No information found" and Lead center offered 0 options, with a single request attempt.
   *
   * `retryDelayMs` is an instance field on purpose so a spec can shrink it; keep the product value under a
   * couple of seconds so a transient blip is absorbed before the first screen asks for the list.
   */
  private static readonly RETRY_COUNT = 2;
  private retryDelayMs = 600;

  /** In-flight request, so concurrent callers share one attempt and a FAILED attempt can be retried later. */
  private inFlight: Promise<CenterDto[]> | null = null;

  constructor(private api: ApiService) {
    // The bootstrap attempt is fire-and-forget: nobody awaits it, so its rejection must be swallowed here or
    // a failing catalogue becomes an unhandled promise rejection (it used to hang forever instead).
    void this.getData().catch(() => undefined);
  }

  /**
   * Resolves the CLARISA centers catalogue, from cache when it is already loaded.
   *
   * ⚠️ Safe (and intended) to call again from a screen that needs the list: it is a no-op once the catalogue
   * is in memory, and the way to recover a session whose bootstrap attempt failed.
   */
  async getData(): Promise<any> {
    if (this.centersList?.length) return JSON.parse(JSON.stringify(this.centersList));
    if (this.inFlight) return this.inFlight;

    const attempt = new Promise<CenterDto[]>((resolve, reject) => {
      // `defer` so every retry ISSUES A NEW REQUEST (an HttpClient observable is cold) and re-reads
      // `api.resultsSE`, which the optional chaining below used to skip silently — leaving a promise that
      // never settled and a catalogue that stayed empty with no error anywhere.
      defer(() => this.api.resultsSE?.GET_AllCLARISACenters() ?? throwError(() => new Error('CLARISA centers request is unavailable')))
        .pipe(
          map(({ response }) => {
            // An empty catalogue is never a legitimate answer (CLARISA always returns the CGIAR centers), so
            // treat it as a failed attempt rather than caching it — a 200 with `[]` produced exactly the same
            // "No information found" dropdown as a 503 when measured against the live environment.
            if (!response?.length) throw new Error('CLARISA centers catalogue came back empty');
            return response as CenterDto[];
          }),
          retry({ count: CentersService.RETRY_COUNT, delay: () => timer(this.retryDelayMs) })
        )
        .subscribe({
          next: response => {
            this.centersList = response;
            this.centers.set(response);
            this.loadedCenters.emit(true);
            resolve([...response]);
          },
          error: err => {
            reject(err);
          }
        });
    });

    this.inFlight = attempt;
    // Release the latch either way. Attaching a rejection handler here also keeps a failed bootstrap call
    // from surfacing as an unhandled promise rejection.
    const release = () => {
      if (this.inFlight === attempt) this.inFlight = null;
    };
    attempt.then(release, release);

    return attempt;
  }
}
