import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import {
  PrTableComponent,
  PrSortIconComponent,
  PrSortableColumnDirective,
  PrTableHeaderDirective,
  PrTableBodyDirective,
  PrTableEmptyDirective
} from 'src/app/shared/components/pr-table';
import { CommonModule } from '@angular/common';
import { ColumnOrder } from '../../aow-hlo-table.component';
import { PdfIconModule } from '../../../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { Router } from '@angular/router';

interface ActionItem {
  icon: string;
  label: string;
  command: () => void;
}

@Component({
  selector: 'app-aow-view-results-drawer',
  imports: [
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    PrTableEmptyDirective,
    CommonModule,
    PdfIconModule
  ],
  templateUrl: './aow-view-results-drawer.component.html',
  styleUrl: './aow-view-results-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowViewResultsDrawerComponent implements OnInit, OnDestroy {
  entityAowService = inject(EntityAowService);
  router = inject(Router);

  selectedProduct: any = null;
  isLoadingResults = signal<boolean>(false);

  // Row actions menu state (replaces PrimeNG p-popover)
  actionMenuOpen = signal<boolean>(false);
  actionMenuX = signal<number>(0);
  actionMenuY = signal<number>(0);

  columns = signal<ColumnOrder[]>([
    { title: 'Code', attr: 'result_code', width: '10%' },
    { title: 'Title', attr: 'title' },
    { title: 'Status', attr: 'status_name', width: '130px' },
    { title: 'Target achieved', attr: 'contributing_indicator', width: '130px' }
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

  openActionMenu(event: MouseEvent, product: any) {
    event.stopPropagation();
    this.setSelectedProduct(product);
    this.actionMenuX.set(event.clientX);
    this.actionMenuY.set(event.clientY);
    this.actionMenuOpen.set(true);
  }

  closeActionMenu() {
    this.actionMenuOpen.set(false);
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
