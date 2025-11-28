import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CenterDto } from '../../../../../../shared/interfaces/center.dto';

@Component({
  selector: 'app-indicators-sidebar',
  imports: [CommonModule],
  templateUrl: './indicators-sidebar.component.html',
  styleUrl: './indicators-sidebar.component.scss'
})
export class IndicatorsSidebarComponent implements OnInit {
  centersService = inject(CentersService);

  // null = All Centers, string = center code
  selectedCenterCode = signal<string | null>(null);

  // Lista de centros desde el servicio
  centers = signal<CenterDto[]>([]);

  ngOnInit(): void {
    this.getCenters();
  }

  getCenters(): void {
    this.centersService.getData().then((centers: CenterDto[]) => {
      this.centers.set(centers);
    });
  }

  selectCenter(centerCode: string | null): void {
    this.selectedCenterCode.set(centerCode);
  }

  isSelected(centerCode: string | null): boolean {
    return this.selectedCenterCode() === centerCode;
  }
}
