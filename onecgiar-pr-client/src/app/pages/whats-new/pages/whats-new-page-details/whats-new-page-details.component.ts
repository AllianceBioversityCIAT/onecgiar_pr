import { ChangeDetectionStrategy, Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WhatsNewService } from '../../services/whats-new.service';
import { CommonModule, Location } from '@angular/common';
import { DynamicNotionBlockComponent } from '../../../../shared/components/dynamic-notion-block/dynamic-notion-block.component';
import { Subscription } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { WhatsNewPageDetailsLoadingComponent } from './components/whats-new-page-details-loading/whats-new-page-details-loading.component';

@Component({
  selector: 'app-whats-new-page-details',
  standalone: true,
  imports: [CommonModule, DynamicNotionBlockComponent, TooltipModule, SkeletonModule, WhatsNewPageDetailsLoadingComponent],
  templateUrl: './whats-new-page-details.component.html',
  styleUrls: ['./whats-new-page-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPageDetailsComponent implements OnInit, OnDestroy {
  notionPageId = signal<string>('');
  whatsNewService = inject(WhatsNewService);

  private paramsSubscription: Subscription;
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.paramsSubscription = this.route.params.subscribe(params => {
      const newId = params['id'];
      this.notionPageId.set(newId);

      if (newId) {
        this.whatsNewService.getNotionBlockChildren(newId);
      }
    });
  }

  ngOnDestroy() {
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

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/whats-new']);
    }
  }
}
