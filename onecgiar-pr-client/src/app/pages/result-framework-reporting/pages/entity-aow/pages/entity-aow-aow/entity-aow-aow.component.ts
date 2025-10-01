import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntityAowService } from '../../services/entity-aow.service';
@Component({
  selector: 'app-entity-aow-aow',
  imports: [],
  templateUrl: './entity-aow-aow.component.html',
  styleUrl: './entity-aow-aow.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityAowAowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly entityAowService = inject(EntityAowService);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.aowId.set(params['aowId']);
    });
  }
}
