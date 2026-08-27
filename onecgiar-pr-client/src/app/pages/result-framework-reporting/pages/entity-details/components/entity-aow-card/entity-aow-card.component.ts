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
}
