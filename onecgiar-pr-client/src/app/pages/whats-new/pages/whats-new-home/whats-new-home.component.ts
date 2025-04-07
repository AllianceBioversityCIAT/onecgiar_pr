import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { WhatsNewCardComponent } from './components/whats-new-card/whats-new-card.component';
import { RouterModule } from '@angular/router';
import { WhatsNewService } from '../../services/whats-new.service';
import { WhatsNewListItemComponent } from './components/whats-new-list-item/whats-new-list-item.component';
@Component({
  selector: 'app-whats-new-home',
  standalone: true,
  imports: [CommonModule, TooltipModule, WhatsNewCardComponent, RouterModule, WhatsNewListItemComponent],
  templateUrl: './whats-new-home.component.html',
  styleUrl: './whats-new-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewHomeComponent {
  data = null;
  whatsNewService = inject(WhatsNewService);

  setActiveNotionPageData(item: any) {
    this.whatsNewService.activeNotionPageData.set({
      headerInfo: {
        cover: item.cover,
        properties: item.properties,
        id: item.id
      }
    });
  }
}
