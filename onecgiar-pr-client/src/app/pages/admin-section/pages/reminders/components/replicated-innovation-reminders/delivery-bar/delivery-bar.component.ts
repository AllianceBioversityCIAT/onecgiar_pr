// @akili-spec changes/admin-reminders-page (ARP-T-2)
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../../internationalization/replicated-innovation-reminders.copy';

type SegmentKey = 'sent' | 'unreachable' | 'skipped' | 'failed';

interface Segment {
  key: SegmentKey;
  count: number;
  text: string;
  fill: string;
}

/**
 * Presentational stacked delivery bar + text from the four campaign counts. Counts equal to 0 are left out of
 * both the bar and the text (ARP-R-6). `dispatched` tells "never sent" from "sent with nothing to show".
 * Status is carried by the text; the bar is decorative (ARP-NFR-1).
 */
@Component({
  selector: 'app-delivery-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-w-[9rem] flex-col gap-1" data-testid="rir-delivery">
      @if (segments().length) {
        <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--pr-color-accents-2)]" aria-hidden="true">
          @for (s of segments(); track s.key) {
            <span class="h-full" [class]="s.fill" [style.width.%]="(s.count / total()) * 100" [attr.data-testid]="'arp-delivery-seg-' + s.key"></span>
          }
        </div>
      }
      <span class="text-[12px] tabular-nums text-[var(--pr-color-secondary-400)]" data-testid="arp-delivery-text">{{ text() }}</span>
    </div>
  `
})
export class DeliveryBarComponent {
  private readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY.delivery;

  readonly sent = input(0);
  readonly unreachable = input(0);
  readonly skipped = input(0);
  readonly failed = input(0);
  /** True once the campaign has been dispatched (any send, even partial). */
  readonly dispatched = input(false);

  readonly segments = computed<Segment[]>(() => {
    const all: Segment[] = [
      { key: 'sent', count: this.sent(), text: this.copy.sent(this.sent()), fill: 'bg-[var(--pr-color-green-500)]' },
      { key: 'unreachable', count: this.unreachable(), text: this.copy.unreachable(this.unreachable()), fill: 'bg-[var(--pr-color-yellow-300)]' },
      { key: 'skipped', count: this.skipped(), text: this.copy.skipped(this.skipped()), fill: 'bg-[var(--pr-color-accents-3)]' },
      { key: 'failed', count: this.failed(), text: this.copy.failed(this.failed()), fill: 'bg-[var(--pr-color-red-300)]' }
    ];
    return all.filter(s => s.count > 0);
  });
  readonly total = computed(() => this.segments().reduce((sum, s) => sum + s.count, 0));
  readonly text = computed(() => {
    const parts = this.segments();
    if (parts.length) return parts.map(s => s.text).join(' · ');
    return this.dispatched() ? this.copy.none : this.copy.notSent;
  });
}
