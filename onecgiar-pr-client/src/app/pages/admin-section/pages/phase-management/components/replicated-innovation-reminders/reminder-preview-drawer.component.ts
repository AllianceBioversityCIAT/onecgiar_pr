// @akili-spec changes/replicated-innovation-reminders (RIR-T-6, RIR-R-9)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmSheetImports } from '@spartan/sheet';
import { HlmButtonImports } from '@spartan/button';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../internationalization/replicated-innovation-reminders.copy';
import { ReminderPreview } from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';

/** Dry-run preview sheet: totals, digests (To / CC / results), unreachable table, redirect banner. */
@Component({
  selector: 'app-reminder-preview-drawer',
  imports: [HlmSheetImports, HlmButtonImports, HlmSkeleton, HlmTableImports],
  templateUrl: './reminder-preview-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderPreviewDrawerComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly preview = input<ReminderPreview | null>(null);
  readonly closed = output<void>();

  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY.preview;
  protected readonly noValue = REPLICATED_INNOVATION_REMINDERS_COPY.noValue;
  protected readonly actionCopy = REPLICATED_INNOVATION_REMINDERS_COPY.actions;
  protected readonly totalsText = computed(() => {
    const t = this.preview()?.totals;
    return t ? this.copy.totals(t.leads, t.results, t.cc_addresses) : '';
  });
}
