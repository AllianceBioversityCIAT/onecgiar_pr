// @akili-spec changes/rir-center-focal-routing (RCF-T-4)
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmBadge } from '@spartan/badge';
import { HlmButtonImports } from '@spartan/button';
import { HlmDialogImports } from '@spartan/dialog';
import { HlmInputImports } from '@spartan/input';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../internationalization/replicated-innovation-reminders.copy';
import { CenterFocalPointView, CenterRoutingView } from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';

export type FocalFilter = 'all' | 'missing' | 'optIn';

/**
 * Reminders page: per-Center opt-in ("focal point receives all reminders") and the
 * Center focal point contacts (RCF-R-7, RCF-R-8). Contacts are never deleted, only deactivated.
 * Any in-flight mutation locks every action.
 */
@Component({
  selector: 'app-center-focal-points',
  imports: [HlmButtonImports, HlmBadge, HlmDialogImports, HlmInputImports, HlmSkeleton, HlmTableImports],
  templateUrl: './center-focal-points.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterFocalPointsComponent implements OnInit {
  private readonly api = inject(ResultsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY.centerFocalPoints;
  protected readonly commonCopy = REPLICATED_INNOVATION_REMINDERS_COPY;

  /** Centers with no active contact; emitted after a successful load and after every contacts change, never on loading/error. */
  readonly missingCount = output<number>();

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly centers = signal<CenterRoutingView[]>([]);
  readonly busy = signal(false);
  /** Row-level error (opt-in toggle) by Center code. */
  readonly rowError = signal<Record<string, string>>({});
  /** Server warning by Center code, shown when the opt-in was turned on with no active contact (RCF-R-8). */
  readonly warnings = signal<Record<string, string>>({});
  /** Text for the polite live region: the outcome of the last opt-in change (ARP-NFR-1). */
  readonly liveMessage = signal('');
  protected readonly chips: { key: FocalFilter; testKey: string; label: string }[] = [
    { key: 'all', testKey: 'all', label: this.copy.chipAll },
    { key: 'missing', testKey: 'missing', label: this.copy.chipMissing },
    { key: 'optIn', testKey: 'optin', label: this.copy.chipOptIn }
  ];

  /** Toolbar state (ARP-R-8): chip filter and free-text query, both client-side. */
  readonly filter = signal<FocalFilter>('all');
  readonly query = signal('');
  readonly counts = computed(() => {
    const list = this.centers();
    return {
      all: list.length,
      missing: list.filter(c => this.activeContacts(c).length === 0).length,
      optIn: list.filter(c => c.route_all_to_center).length
    };
  });
  readonly visibleCenters = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.centers().filter(c => {
      if (f === 'missing' && this.activeContacts(c).length > 0) return false;
      if (f === 'optIn' && !c.route_all_to_center) return false;
      if (!q) return true;
      const haystack = [c.code, c.acronym, c.name, ...c.contacts.flatMap(x => [x.name, x.email])];
      return haystack.some(v => !!v && v.toLowerCase().includes(q));
    });
  });

  readonly dialogCode = signal<string | null>(null);
  readonly dialogCenter = computed(() => this.centers().find(c => c.code === this.dialogCode()) ?? null);
  readonly formName = signal('');
  readonly formEmail = signal('');
  readonly editingId = signal<number | null>(null);
  readonly formError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .GET_centerFocalPoints()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.centers.set(res?.response ?? []);
          this.loading.set(false);
          this.emitMissing();
        },
        error: err => {
          this.loadError.set(this.messageOf(err, this.copy.loadError));
          this.loading.set(false);
        }
      });
  }

  centerLabel(c: CenterRoutingView): string {
    return c.acronym || c.name || c.code;
  }
  activeContacts(c: CenterRoutingView): CenterFocalPointView[] {
    return c.contacts.filter(x => x.is_active);
  }
  /** Up to two initials of a contact (name, else email local part) for the pill avatar. */
  initials(x: CenterFocalPointView): string {
    const src = (x.name || x.email.split('@')[0] || '').trim();
    const parts = src.split(/[\s._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  contactLabel(x: CenterFocalPointView): string {
    return x.name ? `${x.name} <${x.email}>` : x.email;
  }

  // Opt-in (RCF-R-8) --------------------------------------------------------------------------
  /** Optimistic: the new value is reflected at once and rolled back if the server refuses it. */
  toggleRouting(c: CenterRoutingView, value: boolean): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.rowError.update(e => ({ ...e, [c.code]: '' }));
    this.setRouting(c.code, value);
    this.api
      .PATCH_centerRouting(c.code, { route_all_to_center: value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.busy.set(false);
          const r = res?.response;
          this.setRouting(c.code, r?.route_all_to_center ?? value);
          this.warnings.update(w => ({ ...w, [c.code]: r?.warning ?? '' }));
          const on = r?.route_all_to_center ?? value;
          this.liveMessage.set(on ? this.copy.routingOnAnnounce(this.centerLabel(c)) : this.copy.routingOffAnnounce(this.centerLabel(c)));
          this.emitMissing();
        },
        error: err => {
          this.busy.set(false);
          this.setRouting(c.code, !value);
          const message = this.messageOf(err, this.copy.routingError);
          this.rowError.update(e => ({ ...e, [c.code]: message }));
          this.liveMessage.set(message);
        }
      });
  }

  private setRouting(code: string, value: boolean): void {
    this.centers.update(list => list.map(c => (c.code === code ? { ...c, route_all_to_center: value } : c)));
  }

  // Contacts dialog (RCF-R-7) -----------------------------------------------------------------
  openDialog(c: CenterRoutingView): void {
    this.resetForm();
    this.dialogCode.set(c.code);
  }
  closeDialog(): void {
    if (this.busy()) return;
    this.dialogCode.set(null);
    this.resetForm();
  }
  startEdit(x: CenterFocalPointView): void {
    this.formError.set(null);
    this.editingId.set(x.id);
    this.formName.set(x.name ?? '');
    this.formEmail.set(x.email);
  }
  cancelEdit(): void {
    this.resetForm();
  }

  submitForm(): void {
    const center = this.dialogCenter();
    if (!center || this.busy()) return;
    const email = this.formEmail().trim();
    if (!email) {
      this.formError.set(this.copy.dialog.emailRequired);
      return;
    }
    const name = this.formName().trim();
    const editId = this.editingId();
    this.formError.set(null);
    this.busy.set(true);
    if (editId === null) {
      this.api
        .POST_centerFocalPoint({ center_code: center.code, ...(name ? { name } : {}), email })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.busy.set(false);
            if (res?.response) this.patchContacts(center.code, list => [...list, res.response]);
            this.clearWarning(center.code);
            this.resetForm();
          },
          error: err => this.failForm(err)
        });
    } else {
      this.api
        .PATCH_centerFocalPoint(editId, { name, email })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: res => {
            this.busy.set(false);
            if (res?.response) this.patchContacts(center.code, list => list.map(x => (x.id === editId ? res.response : x)));
            this.resetForm();
          },
          error: err => this.failForm(err)
        });
    }
  }

  toggleActive(x: CenterFocalPointView): void {
    const center = this.dialogCenter();
    if (!center || this.busy()) return;
    this.formError.set(null);
    this.busy.set(true);
    this.api
      .PATCH_centerFocalPoint(x.id, { is_active: !x.is_active })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.busy.set(false);
          if (res?.response) this.patchContacts(center.code, list => list.map(y => (y.id === x.id ? res.response : y)));
          this.clearWarning(center.code);
        },
        error: err => this.failForm(err)
      });
  }

  private failForm(err: any): void {
    this.busy.set(false);
    this.formError.set(this.messageOf(err, this.copy.dialog.requestError));
  }
  private emitMissing(): void {
    this.missingCount.emit(this.centers().filter(c => this.activeContacts(c).length === 0).length);
  }

  private patchContacts(code: string, fn: (list: CenterFocalPointView[]) => CenterFocalPointView[]): void {
    this.centers.update(list => list.map(c => (c.code === code ? { ...c, contacts: fn(c.contacts) } : c)));
    this.emitMissing();
  }
  /** The contact set changed, so a previous "no active contact" warning may no longer hold. */
  private clearWarning(code: string): void {
    this.warnings.update(w => ({ ...w, [code]: '' }));
  }
  private resetForm(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formEmail.set('');
    this.formError.set(null);
  }

  /** HttpExceptionFilter body: `{ message }`; class-validator arrays are joined. */
  private messageOf(err: any, fallback: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join('. ');
    return typeof m === 'string' && m ? m : fallback;
  }
}
