import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, throwError, of } from 'rxjs';

import { SaveButtonService } from './save-button.service';

describe('SaveButtonService', () => {
  let service: SaveButtonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveButtonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * P2-3659 / P2-3654 — `Next` in the result-detail wizard asks for the section to be saved and has
   * to know how that save ended before it decides whether to move on. `isSaving` alone cannot tell
   * "finished fine" from "failed": it is one shared flag that goes up and then down either way.
   *
   * These run on REAL timers on purpose: `saveAndSettle` is plain `async/await` over `setTimeout`,
   * and zone.js's `fakeAsync` does not drain those promises — every assertion read `undefined`.
   */
  describe('saveAndSettle (Next waits for the save)', () => {
    /** Wires a piped request the way every section's save does, and hands back its source. */
    const pipedSave = () => {
      const source = new Subject<unknown>();
      source.pipe(service.isSavingPipe()).subscribe({ next: () => undefined, error: () => undefined });
      return source;
    };

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    it('reports `saved` when the triggered save succeeds', async () => {
      let source!: Subject<unknown>;
      const settling = service.saveAndSettle(() => (source = pipedSave()));

      await wait(60);
      source.next({ ok: true });

      await expect(settling).resolves.toBe('saved');
    });

    it('reports `failed` when the triggered save errors', async () => {
      let source!: Subject<unknown>;
      const settling = service.saveAndSettle(() => (source = pipedSave()));

      await wait(60);
      source.error({ status: 500 });

      await expect(settling).resolves.toBe('failed');
    });

    /**
     * A handler that returns on its own guard, or opens a confirmation modal, never reaches the
     * network. The caller must be able to tell that apart from a rejection — treating it as a
     * failure would make `Next` do nothing at all on those sections.
     */
    it('reports `not-started` when the trigger sends nothing', async () => {
      await expect(service.saveAndSettle(() => undefined)).resolves.toBe('not-started');
    });

    /**
     * Evidences raises and lowers the spinner by hand around its file uploads. Without the idle
     * grace period that would hold the caller until the full save timeout.
     */
    it('reports `not-started` when the spinner goes up and down with no request', async () => {
      const settling = service.saveAndSettle(() => {
        service.showSaveSpinner();
        service.hideSaveSpinner();
      });

      await expect(settling).resolves.toBe('not-started');
    });

    it('tells two consecutive saves apart', async () => {
      let source!: Subject<unknown>;

      const first = service.saveAndSettle(() => (source = pipedSave()));
      await wait(60);
      source.next({ ok: true });
      await expect(first).resolves.toBe('saved');

      const second = service.saveAndSettle(() => (source = pipedSave()));
      await wait(60);
      source.error({ status: 400 });
      await expect(second).resolves.toBe('failed');
    });
  });

  describe('inFlightPipe (per-surface spinner for modals / drawers / inline actions)', () => {
    it('should not touch the flag until the caller subscribes', () => {
      const flag = signal(false);

      of({ ok: true }).pipe(service.inFlightPipe(flag));

      expect(flag()).toBe(false);
    });

    it('should raise the flag while the request is in flight and lower it on success', () => {
      const flag = signal(false);
      const source = new Subject<unknown>();

      source.pipe(service.inFlightPipe(flag)).subscribe({ error: () => undefined });
      expect(flag()).toBe(true);

      source.next({ ok: true });
      source.complete();

      expect(flag()).toBe(false);
    });

    it('should lower the flag on error — a failed save must not leave a dead button', () => {
      const flag = signal(false);

      throwError(() => new Error('500'))
        .pipe(service.inFlightPipe(flag))
        .subscribe({ error: () => undefined });

      expect(flag()).toBe(false);
    });

    it('should lower the flag when the caller unsubscribes (component destroyed mid-save)', () => {
      const flag = signal(false);
      const source = new Subject<unknown>();

      const sub = source.pipe(service.inFlightPipe(flag)).subscribe();
      expect(flag()).toBe(true);

      sub.unsubscribe();

      expect(flag()).toBe(false);
    });

    it('should leave the global fixed-bar spinner alone', () => {
      const flag = signal(false);
      const source = new Subject<unknown>();

      source.pipe(service.inFlightPipe(flag)).subscribe();

      expect(service.isSaving()).toBe(false);
    });
  });

  describe('runInFlight (promise-based handlers)', () => {
    it('should raise the flag for the duration of the work and lower it afterwards', async () => {
      const flag = signal(false);

      const promise = service.runInFlight(flag, async () => {
        expect(flag()).toBe(true);
        return 'done';
      });

      await expect(promise).resolves.toBe('done');
      expect(flag()).toBe(false);
    });

    it('should lower the flag and rethrow when the work fails', async () => {
      const flag = signal(false);

      await expect(service.runInFlight(flag, () => Promise.reject(new Error('500')))).rejects.toThrow('500');

      expect(flag()).toBe(false);
    });
  });

  /**
   * A save request the server accepts and never answers used to leave the button reading
   * "Saving…", disabled, for ever — no error, no way back except reloading and losing the work.
   * There is no HTTP timeout in the interceptors, so the ceiling lives here.
   */
  describe('a save that never gets answered', () => {
    it('gives up after the ceiling instead of spinning for ever', fakeAsync(() => {
      const neverAnswers = new Subject<any>();
      let errored = false;

      neverAnswers.pipe(service.isSavingPipe()).subscribe({ error: () => (errored = true) });
      expect(service.isSaving()).toBe(true);

      tick(59_000);
      expect(errored).toBe(false);
      expect(service.isSaving()).toBe(true);

      tick(2_000);
      expect(errored).toBe(true);
      expect(service.isSaving()).toBe(false);

      neverAnswers.complete();
      flush();
    }));

    it('does not fire before the ceiling — a slow but answered save is untouched', fakeAsync(() => {
      const slow = new Subject<any>();
      let errored = false;

      slow.pipe(service.isSavingPipe()).subscribe({ next: () => {}, error: () => (errored = true) });

      tick(30_000);
      expect(errored).toBe(false);
      expect(service.isSaving()).toBe(true);

      slow.complete();
      flush();
    }));
  });
});
