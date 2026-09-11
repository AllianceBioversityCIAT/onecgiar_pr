import { PrTooltipDirectiveModule } from '../../../../../../shared/directives/pr-tooltip-directive.module';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { WhatsNewService } from '../../../../services/whats-new.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-whats-new-list-item',
    imports: [PrTooltipDirectiveModule, CommonModule],
    templateUrl: './whats-new-list-item.component.html',
    styleUrl: './whats-new-list-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewListItemComponent {
  @Input() item: any;
  whatsNewService = inject(WhatsNewService);
}
