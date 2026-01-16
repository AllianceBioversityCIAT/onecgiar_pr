import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // null = All Centers, string = center code
  selectedCenterCode = signal<string | null>(null);

  ngOnInit(): void {
    this.getCenters();
  }

  getCenters(): void {
    this.centersService.getData().then((centers: CenterDto[]) => {
      this.bilateralResultsService.centers.set(centers);
      this.selectCenter(null);
    });
  }

  selectCenter(centerCode: string | null): void {
    this.selectedCenterCode.set(centerCode);
    this.bilateralResultsService.selectCenter(centerCode);
  }

  isSelected(centerCode: string | null): boolean {
    return this.selectedCenterCode() === centerCode;
  }
}
