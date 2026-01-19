import { ChangeDetectionStrategy, Component, inject, Input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { EntityAowService } from '../../../entity-aow/services/entity-aow.service';

@Component({
  selector: 'app-entity-results-by-indicator-category-card',
  imports: [ButtonModule, CommonModule],
  templateUrl: './entity-results-by-indicator-category-card.component.html',
  styleUrl: './entity-results-by-indicator-category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityResultsByIndicatorCategoryCardComponent {
  @Input() item: any;
  readonly reportRequested = output<any>();
  entityAowService = inject(EntityAowService);

  onReportClick(): void {
    this.reportRequested.emit(this.item);
  }

  getIcon(indicatorType: number) {
    switch (indicatorType) {
      case 7:
        return 'pi pi-flag';
      case 6:
        return 'pi pi-book';
      case 5:
        return 'pi pi-users';
      case 2:
        return 'pi pi-sun';
      case 1:
        return 'pi pi-folder-open';
      default:
        return 'pi pi-folder';
    }
  }
}
