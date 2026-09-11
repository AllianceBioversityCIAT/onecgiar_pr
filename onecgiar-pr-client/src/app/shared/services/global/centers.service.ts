import { EventEmitter, Injectable, signal } from '@angular/core';
import { defer, map, retry, throwError, timer } from 'rxjs';
import { ApiService } from '../api/api.service';
import { CenterDto } from '../../interfaces/center.dto';

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  /**
   * Plain-array view of the CLARISA centers catalogue, kept as the public name ~25 screens already use.
   *
   * P2-3678: this is no longer a field of its own — it is a getter/setter over `centers`, so both views of
   * the catalogue can no longer disagree and, more importantly, ANY consumer that reads this name from a
   * template or a `computed()` is now subscribed to the signal and rebuilds when the catalogue lands. That
   * removes the whole class of defect behind P2-3190, P2-3335 and P2-3554 instead of one screen at a time.
   *
   * 🛑 Returns `centers()` BY REFERENCE on purpose — never a copy. Five of the eight template bindings feed
   * `pr-select`, which derives its options in a `computed()` over the `options` input with no content
   * comparison and renders them through `*cdkVirtualFor` without `trackBy`: a fresh array on every
   * change-detection pass rebuilds the options every time. That is the `synchronize()` loop that froze
   * IPSR › Contributors and is documented in `pr-multi-select.component.ts` (~line 85).
   */
  get centersList(): CenterDto[] {
    return this.centers();
  }

  set centersList(value: CenterDto[]) {
    this.centers.set(value ?? []);
  }

  /**
   * P2-3190: signal-backed view of the catalogue, and since P2-3678 the ONLY place it is stored —
   * `centersList` above is a getter/setter over this signal.
   *
   * The catalogue resolves asynchronously. Before P2-3678 this was stored twice — a plain array plus this
   * signal — and any `computed()` reading the plain array cached whatever was there on its first evaluation
   * and never recomputed when the HTTP response landed, because a plain array is not a reactive dependency
   * and zoneless change detection rescues nothing. Holding the catalogue only here is what makes that
   * impossible to reproduce again, whichever of the two names a consumer reads.
   *
   * `InitiativesService` (`allInitiativesList` + `allInitiatives`) and `InstitutionsService` still keep the
   * two-fields-in-parallel shape; this service is the first to collapse them.
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
            // P2-3678: one write, one home. `centersList` is a getter/setter over this signal now, so
            // assigning it as well would just call `centers.set` a second time with the same reference.
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
