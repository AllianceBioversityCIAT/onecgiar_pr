import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-entity-aow-card',
  imports: [ProgressBarModule],
  templateUrl: './entity-aow-card.component.html',
  styleUrl: './entity-aow-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowCardComponent {
  @Input() item: any;
}
