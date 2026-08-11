import { TestBed } from '@angular/core/testing';
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
});
