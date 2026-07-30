import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AowHloTableComponent } from '../entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component';
import { CommonModule } from '@angular/common';
import { EntityAowService } from '../../services/entity-aow.service';

@Component({
  selector: 'app-entity-aow-unplanned',
  imports: [CommonModule, AowHloTableComponent],
  templateUrl: './entity-aow-unplanned.component.html',
  styleUrl: './entity-aow-unplanned.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowUnplannedComponent implements OnInit {
  entityAowService = inject(EntityAowService);

  ngOnInit() {
    this.entityAowService.searchText.set('');
    this.entityAowService.getIntermediateOutcomes(this.entityAowService.entityId());
  }
}
