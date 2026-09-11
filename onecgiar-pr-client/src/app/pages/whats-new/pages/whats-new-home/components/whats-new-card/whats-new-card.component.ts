import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsNewService } from '../../../../services/whats-new.service';
@Component({
    selector: 'app-whats-new-card',
    imports: [PrTooltipDirectiveModule, CommonModule],
    templateUrl: './whats-new-card.component.html',
    styleUrl: './whats-new-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewCardComponent {
  @Input() item: any;
  whatsNewService = inject(WhatsNewService);
}
