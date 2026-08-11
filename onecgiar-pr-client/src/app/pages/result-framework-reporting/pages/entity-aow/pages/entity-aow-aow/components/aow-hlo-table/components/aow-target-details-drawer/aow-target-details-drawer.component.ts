import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

interface Target {
  number_target: string;
  target_value: string | number;
  toc_indicator_target_id: string | number;
  year: string | number;
}

interface CenterWithTargets {
  center_id: string | number;
  center_acronym: string;
  center_name: string;
  targets?: Target[];
}

interface TableRow {
  center: CenterWithTargets;
  targetsByYear: Map<string, string>;
}

@Component({
  selector: 'app-aow-target-details-drawer',
  imports: [DrawerModule, CommonModule, TableModule],
  templateUrl: './aow-target-details-drawer.component.html',
  styleUrl: './aow-target-details-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowTargetDetailsDrawerComponent implements OnInit, OnDestroy {
  entityAowService = inject(EntityAowService);

  private readonly centersWithTargets = computed(() => {
    const centers = this.entityAowService.currentTargetToView()?.indicators?.[0]?.targets_by_center?.centers;
    return Array.isArray(centers) ? (centers as CenterWithTargets[]) : [];
  });

  years = computed(() => {
    const yearsSet = new Set<string>();

    this.centersWithTargets().forEach((center: CenterWithTargets) => {
      center.targets?.forEach((target: Target) => {
        if (target.year != null && `${target.year}`.trim() !== '') {
          yearsSet.add(String(target.year));
        }
      });
    });

    return Array.from(yearsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  });

  tableData = computed(() => {
    return this.centersWithTargets().map((center: CenterWithTargets) => {
      const targetsByYear = new Map<string, string>();

      center.targets?.forEach((target: Target) => {
        if (target.year != null && target.target_value != null && `${target.target_value}`.trim() !== '') {
          targetsByYear.set(String(target.year), String(target.target_value));
        }
      });

      return {
        center,
        targetsByYear
      };
    });
  });

  getTargetValue(row: TableRow, year: string): string {
    return row.targetsByYear.get(year) ?? '';
  }

  isSelectedCenter(row: TableRow): boolean {
    const selectedCenterId = this.entityAowService.targetDetailsSelectedCenterId();
    if (selectedCenterId == null) {
      return false;
    }

    return String(row.center.center_id) === String(selectedCenterId);
  }

  closeDrawer(): void {
    this.entityAowService.showTargetDetailsDrawer.set(false);
    this.entityAowService.targetDetailsDrawerFullScreen.set(false);
    this.entityAowService.targetDetailsSelectedCenterId.set(null);
  }

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
    this.entityAowService.targetDetailsSelectedCenterId.set(null);
  }
}
