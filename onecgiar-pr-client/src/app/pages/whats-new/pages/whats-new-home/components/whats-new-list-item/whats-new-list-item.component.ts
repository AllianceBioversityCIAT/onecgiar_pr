import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { WhatsNewService } from '../../../../services/whats-new.service';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-whats-new-list-item',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './whats-new-list-item.component.html',
  styleUrl: './whats-new-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewListItemComponent {
  @Input() item: any;
  whatsNewService = inject(WhatsNewService);
}
