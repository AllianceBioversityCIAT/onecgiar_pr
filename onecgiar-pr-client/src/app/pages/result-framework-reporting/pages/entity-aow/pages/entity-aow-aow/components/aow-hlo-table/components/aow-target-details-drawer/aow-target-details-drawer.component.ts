import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';

interface Center {
  center_id: string;
  center_acronym: string;
  center_name: string;
}

interface Target {
  number_target: string;
  target_value: string;
  toc_indicator_target_id: string;
  year: string;
}

interface TableRow {
  center: Center;
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

  years = computed(() => {
    const targetsByCenter = this.entityAowService.currentTargetToView()?.indicators?.[0]?.targets_by_center;
    if (!targetsByCenter?.targets) return [];

    const yearsSet = new Set<string>();
    targetsByCenter.targets.forEach((target: Target) => {
      if (target.year) yearsSet.add(target.year);
    });

    return Array.from(yearsSet).sort((a, b) => a.localeCompare(b));
  });

  tableData = computed(() => {
    const targetsByCenter = this.entityAowService.currentTargetToView()?.indicators?.[0]?.targets_by_center;
    if (!targetsByCenter?.centers || !targetsByCenter?.targets) return [];

    const centers: Center[] = targetsByCenter.centers;
    const targets: Target[] = targetsByCenter.targets;

    // Create a map of year -> target_value for quick lookup
    const targetsByYearMap = new Map<string, string>();
    targets.forEach((target: Target) => {
      if (target.year && target.target_value) {
        targetsByYearMap.set(target.year, target.target_value);
      }
    });

    return centers.map((center: Center) => {
      const targetsByYear = new Map<string, string>();

      // All centers share the same targets by year
      this.years().forEach(year => {
        const value = targetsByYearMap.get(year);
        if (value) {
          targetsByYear.set(year, value);
        }
      });

      return {
        center,
        targetsByYear
      };
    });
  });

  getTargetValue(row: TableRow, year: string): string {
    return row.targetsByYear.get(year) || '';
  }

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
  }
}
