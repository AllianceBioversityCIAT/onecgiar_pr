import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Center {
  id: number;
  name: string;
  count: number;
  icon: string;
}

@Component({
  selector: '[app-indicators-sidebar]',
  imports: [CommonModule],
  templateUrl: './indicators-sidebar.component.html',
  styleUrl: './indicators-sidebar.component.scss'
})
export class IndicatorsSidebarComponent {
  selectedCenterId = signal<number | null>(2); // CIMMYT seleccionado por defecto

  centers = signal<Center[]>([
    { id: 1, name: 'All Centers', count: 0, icon: 'inventory_2' },
    { id: 2, name: 'CIMMYT', count: 6, icon: 'apartment' },
    { id: 3, name: 'IWMI', count: 6, icon: 'apartment' },
    { id: 4, name: 'AfricaRice', count: 6, icon: 'apartment' },
    { id: 5, name: 'ICARDA', count: 6, icon: 'apartment' },
    { id: 6, name: 'Center 5', count: 4, icon: 'apartment' },
    { id: 7, name: 'Center 6', count: 8, icon: 'apartment' },
    { id: 8, name: 'Center 7', count: 3, icon: 'apartment' },
    { id: 9, name: 'Center 8', count: 4, icon: 'apartment' },
    { id: 10, name: 'Center 9', count: 2, icon: 'apartment' },
    { id: 11, name: 'Center 10', count: 9, icon: 'apartment' },
    { id: 12, name: 'Center 11', count: 5, icon: 'apartment' },
    { id: 13, name: 'Center 12', count: 7, icon: 'apartment' },
    { id: 14, name: 'Center 13', count: 8, icon: 'apartment' },
    { id: 15, name: 'Center 14', count: 3, icon: 'apartment' },
    { id: 16, name: 'Center 15', count: 4, icon: 'apartment' }
  ]);

  selectCenter(centerId: number): void {
    this.selectedCenterId.set(centerId);
  }

  isSelected(centerId: number): boolean {
    return this.selectedCenterId() === centerId;
  }
}
