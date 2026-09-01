import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Unit } from '../../interfaces/entity-details.interface';
import { EntityAowService } from '../../../entity-aow/services/entity-aow.service';

@Component({
  selector: 'app-entity-aow-card',
  imports: [RouterLink],
  templateUrl: './entity-aow-card.component.html',
  styleUrl: './entity-aow-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowCardComponent {
  @Input() item: Unit;
  readonly entityAowService = inject(EntityAowService);

  /**
   * P2-3296 AC3, on the program page. The same roll-up the Area of Work page shows in its own
   * header, keyed by AoW code so one request fills every card.
   *
   * Returns null until the call lands, so the card renders unchanged in the meantime rather
   * than flashing a placeholder percentage.
   */
  get progress(): any | null {
    return this.entityAowService.areaProgressByCode()[this.item?.code ?? ''] ?? null;
  }

  /** A dash, never 0%: no measurable indicator is not the same as no progress. */
  get progressLabel(): string {
    return this.progress?.progress_percentage ?? '—';
  }

  get preliminaryLabel(): string {
    return this.progress?.preliminary_progress_percentage ?? '—';
  }

  get coverage(): string {
    const counted = this.progress?.indicators_counted;
    const total = this.progress?.indicators_total;

    if (!Number.isFinite(counted) || !Number.isFinite(total) || total === 0) return '';

    return counted === total ? `${total} indicators` : `${counted} of ${total} indicators`;
  }
}
