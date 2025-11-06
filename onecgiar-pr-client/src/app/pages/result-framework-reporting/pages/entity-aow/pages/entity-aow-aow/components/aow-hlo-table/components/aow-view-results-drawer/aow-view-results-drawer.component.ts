import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ColumnOrder } from '../../aow-hlo-table.component';
import { PdfIconModule } from '../../../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { PopoverModule } from 'primeng/popover';

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
export class AowViewResultsDrawerComponent implements OnInit {
  entityAowService = inject(EntityAowService);

  columns = signal<ColumnOrder[]>([
    { title: 'Code', attr: 'code', width: '10%' },
    { title: 'Title', attr: 'title' },
    { title: 'Status', attr: 'status', width: '130px' }
  ]);

  actionItems = signal<ActionItem[]>([
    { icon: 'pi pi-eye', label: 'View', command: () => {} },
    { icon: 'pi pi-pencil', label: 'Edit', command: () => {} },
    { icon: 'pi pi-trash', label: 'Delete', command: () => {} }
  ]);

  ngOnInit() {
    this.entityAowService.getExistingResultsContributors(
      this.entityAowService.currentResultToView()?.toc_result_id,
      this.entityAowService.currentResultToView()?.indicators?.[0]?.related_node_id
    );
  }
}
