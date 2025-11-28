import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aow-target-details-drawer',
  imports: [DrawerModule, CommonModule],
  templateUrl: './aow-target-details-drawer.component.html',
  styleUrl: './aow-target-details-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowTargetDetailsDrawerComponent implements OnInit, OnDestroy {
  entityAowService = inject(EntityAowService);

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
  }
}
