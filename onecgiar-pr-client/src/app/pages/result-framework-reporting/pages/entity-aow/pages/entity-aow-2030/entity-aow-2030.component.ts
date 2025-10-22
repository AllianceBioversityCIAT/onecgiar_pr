import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AowHloTableComponent } from '../entity-aow-aow/components/aow-hlo-table/aow-hlo-table.component';
import { CommonModule } from '@angular/common';
import { EntityAowService } from '../../services/entity-aow.service';

@Component({
  selector: 'app-entity-aow-2030',
  imports: [CommonModule, AowHloTableComponent],
  templateUrl: './entity-aow-2030.component.html',
  styleUrl: './entity-aow-2030.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAow2030Component implements OnInit {
  entityAowService = inject(EntityAowService);

  ngOnInit() {
    this.entityAowService.get2030Outcomes(this.entityAowService.entityId());
  }
}
