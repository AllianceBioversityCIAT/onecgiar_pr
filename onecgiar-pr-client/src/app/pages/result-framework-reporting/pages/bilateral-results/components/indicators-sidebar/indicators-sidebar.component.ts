import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';
import { BilateralResultsService } from '../../bilateral-results.service';

@Component({
  selector: 'app-indicators-sidebar',
  imports: [CommonModule],
  templateUrl: './indicators-sidebar.component.html',
  styleUrl: './indicators-sidebar.component.scss'
})
export class IndicatorsSidebarComponent implements OnInit {
  centersService = inject(CentersService);
  bilateralResultsService = inject(BilateralResultsService);
  router = inject(Router);
  activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this.getCenters();
  }

  getCenters(): void {
    this.centersService.getData().then((centers: CenterDto[]) => {
      this.bilateralResultsService.centers.set(centers);

      const centerFromUrl = this.activatedRoute.snapshot.queryParams['center'];
      if (centerFromUrl && centers.some(c => c.code === centerFromUrl)) {
        this.selectCenter(centerFromUrl, false);
      } else {
        this.selectCenter(null, false);
      }
    });
  }

  selectCenter(centerCode: string | null, updateUrl: boolean = true): void {
    this.bilateralResultsService.selectedCenterCode.set(centerCode);
    this.bilateralResultsService.selectCenter(centerCode);

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: centerCode ? { center: centerCode } : {},
        queryParamsHandling: centerCode ? 'merge' : ''
      });
      this.bilateralResultsService.searchText.set('');
    }
  }

  isSelected(centerCode: string | null): boolean {
    return this.bilateralResultsService.selectedCenterCode() === centerCode;
  }
}
