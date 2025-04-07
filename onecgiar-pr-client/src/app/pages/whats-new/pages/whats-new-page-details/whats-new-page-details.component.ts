import { ChangeDetectionStrategy, Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { WhatsNewService } from '../../services/whats-new.service';
import { CommonModule } from '@angular/common';
import { DynamicNotionBlockComponent } from '../../../../shared/components/dynamic-notion-block/dynamic-notion-block.component';
import { Subscription } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-whats-new-page-details',
  standalone: true,
  imports: [CommonModule, DynamicNotionBlockComponent, TooltipModule],
  templateUrl: './whats-new-page-details.component.html',
  styleUrls: ['./whats-new-page-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPageDetailsComponent implements OnInit, OnDestroy {
  notionPageId = signal<string>('');
  whatsNewService = inject(WhatsNewService);
  private paramsSubscription: Subscription;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.paramsSubscription = this.route.params.subscribe(params => {
      const newId = params['id'];
      this.notionPageId.set(newId);

      // Fetch new data when the ID changes
      if (newId) {
        this.whatsNewService.getNotionBlockChildren(newId);
      }
    });
  }

  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.paramsSubscription) {
      this.paramsSubscription.unsubscribe();
    }
  }

  getConsecutiveNumberedItems(startIndex: number): any[] {
    const blocks = this.whatsNewService.activeNotionPageData()?.blocks || [];
    const consecutiveItems = [];
    let currentIndex = startIndex;

    while (currentIndex < blocks.length && blocks[currentIndex].type === 'numbered_list_item') {
      consecutiveItems.push(blocks[currentIndex]);
      currentIndex++;
    }

    return consecutiveItems;
  }
}
