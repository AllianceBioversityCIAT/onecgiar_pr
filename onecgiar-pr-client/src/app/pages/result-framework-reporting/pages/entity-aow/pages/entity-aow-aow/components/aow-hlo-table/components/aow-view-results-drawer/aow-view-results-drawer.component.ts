import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ColumnOrder } from '../../aow-hlo-table.component';
import { PdfIconModule } from '../../../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { PopoverModule } from 'primeng/popover';
import { Router } from '@angular/router';

interface ActionItem {
  icon: string;
  label: string;
  command: () => void;
}

@Component({
  selector: 'app-aow-view-results-drawer',
  imports: [DrawerModule, TableModule, CommonModule, PdfIconModule, PopoverModule],
  templateUrl: './aow-view-results-drawer.component.html',
  styleUrl: './aow-view-results-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowViewResultsDrawerComponent implements OnInit, OnDestroy {
  entityAowService = inject(EntityAowService);
  router = inject(Router);

  selectedProduct: any = null;
  isLoadingResults = signal<boolean>(false);

  columns = signal<ColumnOrder[]>([
    { title: 'Code', attr: 'result_code', width: '10%' },
    { title: 'Title', attr: 'title' },
    { title: 'Status', attr: 'status_name', width: '130px' }
  ]);

  actionItems = signal<ActionItem[]>([{ icon: 'pi pi-eye', label: 'View', command: () => this.navigateToResult() }]);

  navigateToResult() {
    if (this.selectedProduct) {
      this.router.navigate([`/result/result-detail/${this.selectedProduct.result_code}/general-information`], {
        queryParams: { phase: this.selectedProduct.version_id }
      });
    }
  }

  setSelectedProduct(product: any) {
    this.selectedProduct = product;
  }

  navigateToResultDirect(product: any) {
    const url = this.router.serializeUrl(
      this.router.createUrlTree([`/result/result-detail/${product.result_code}/general-information`], {
        queryParams: { phase: product.version_id }
      })
    );
    window.open(url, '_blank');
  }

  ngOnInit() {
    this.isLoadingResults.set(true);
    this.entityAowService.getExistingResultsContributors(
      this.entityAowService.currentResultToView()?.toc_result_id,
      this.entityAowService.currentResultToView()?.indicators?.[0]?.related_node_id
    );

    setTimeout(() => {
      this.isLoadingResults.set(false);
    }, 1000);

    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
  }
}
