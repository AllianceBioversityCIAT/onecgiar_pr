import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { WhatsNewService } from '../../../../services/whats-new.service';
@Component({
    selector: 'app-whats-new-card',
    imports: [TooltipModule, CommonModule],
    templateUrl: './whats-new-card.component.html',
    styleUrl: './whats-new-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewCardComponent {
  @Input() item: any;
  whatsNewService = inject(WhatsNewService);
}
