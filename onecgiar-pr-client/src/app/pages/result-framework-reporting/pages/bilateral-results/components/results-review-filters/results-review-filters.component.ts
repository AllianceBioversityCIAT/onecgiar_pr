import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ChipModule } from 'primeng/chip';
import { BilateralResultsService } from '../../bilateral-results.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

@Component({
  selector: 'app-results-review-filters',
  imports: [
    CommonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormsModule,
    MultiSelectModule,
    ButtonModule,
    OverlayBadgeModule,
    ChipModule,
    CustomFieldsModule
  ],
  templateUrl: './results-review-filters.component.html',
  styleUrl: './results-review-filters.component.scss'
})
export class ResultsReviewFiltersComponent implements OnInit, OnDestroy {
  bilateralResultsService = inject(BilateralResultsService);

  visible = signal(false);
  navbarHeight = signal(60);

  tempSelectedIndicatorCategories = signal<string[]>([]);
  tempSelectedStatus = signal<string[]>([]);
  tempSelectedLeadCenters = signal<string[]>([]);

  filtersCount = computed(() => {
    let count = 0;
    if (this.bilateralResultsService.selectedIndicatorCategories().length > 0) count++;
    if (this.bilateralResultsService.selectedStatus().length > 0) count++;
    if (this.bilateralResultsService.selectedLeadCenters().length > 0) count++;
    return count;
  });

  filtersCountText = computed(() => {
    if (this.filtersCount() === 0) return 'Apply filters';
    return `Apply filters (${this.filtersCount()})`;
  });

  filterChipGroups = computed(() => {
    const groups: Array<{ category: string; chips: Array<{ label: string; filterType: string; item: string }> }> = [];
    const indicatorChips = this.bilateralResultsService.selectedIndicatorCategories().map(name => ({
      label: name,
      filterType: 'indicatorCategory',
      item: name
    }));
    if (indicatorChips.length > 0) groups.push({ category: 'Indicator category', chips: indicatorChips });
    const statusChips = this.bilateralResultsService.selectedStatus().map(name => ({
      label: name,
      filterType: 'status',
      item: name
    }));
    if (statusChips.length > 0) groups.push({ category: 'Status', chips: statusChips });
    const leadCenterChips = this.bilateralResultsService.selectedLeadCenters().map(name => ({
      label: name,
      filterType: 'leadCenter',
      item: name
    }));
    if (leadCenterChips.length > 0) groups.push({ category: 'Lead center', chips: leadCenterChips });
    return groups;
  });

  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    this.calculateNavbarHeight();
    this.setupResizeObserver();
  }

  private calculateNavbarHeight(): void {
    const navbar =
      document.querySelector('app-header-panel') ||
      document.querySelector('header') ||
      document.querySelector('nav') ||
      document.querySelector('.navbar') ||
      document.querySelector('.header');

    if (navbar) {
      const height = navbar.getBoundingClientRect().height;
      this.navbarHeight.set(height);
    } else {
      this.navbarHeight.set(60);
    }
  }

  private setupResizeObserver(): void {
    const navbar =
      document.querySelector('app-header-panel') ||
      document.querySelector('header') ||
      document.querySelector('nav') ||
      document.querySelector('.navbar') ||
      document.querySelector('.header');

    if (navbar) {
      this.resizeObserver = new ResizeObserver(() => this.calculateNavbarHeight());
      this.resizeObserver.observe(navbar);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  openFiltersDrawer(): void {
    this.tempSelectedIndicatorCategories.set([...this.bilateralResultsService.selectedIndicatorCategories()]);
    this.tempSelectedStatus.set([...this.bilateralResultsService.selectedStatus()]);
    this.tempSelectedLeadCenters.set([...this.bilateralResultsService.selectedLeadCenters()]);
    this.visible.set(true);
  }

  applyFilters(): void {
    this.bilateralResultsService.selectedIndicatorCategories.set([...this.tempSelectedIndicatorCategories()]);
    this.bilateralResultsService.selectedStatus.set([...this.tempSelectedStatus()]);
    this.bilateralResultsService.selectedLeadCenters.set([...this.tempSelectedLeadCenters()]);
    this.visible.set(false);
  }

  cancelFilters(): void {
    this.tempSelectedIndicatorCategories.set([...this.bilateralResultsService.selectedIndicatorCategories()]);
    this.tempSelectedStatus.set([...this.bilateralResultsService.selectedStatus()]);
    this.tempSelectedLeadCenters.set([...this.bilateralResultsService.selectedLeadCenters()]);
    this.visible.set(false);
  }

  clearAllNewFilters(): void {
    this.bilateralResultsService.clearBilateralTableFilters();
  }

  removeFilter(chip: { label: string; filterType: string; item: string }): void {
    switch (chip.filterType) {
      case 'indicatorCategory':
        this.bilateralResultsService.selectedIndicatorCategories.set(
          this.bilateralResultsService.selectedIndicatorCategories().filter(v => v !== chip.item)
        );
        break;
      case 'status':
        this.bilateralResultsService.selectedStatus.set(
          this.bilateralResultsService.selectedStatus().filter(v => v !== chip.item)
        );
        break;
      case 'leadCenter':
        this.bilateralResultsService.selectedLeadCenters.set(
          this.bilateralResultsService.selectedLeadCenters().filter(v => v !== chip.item)
        );
        break;
    }
  }
}
