import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressBarModule } from 'primeng/progressbar';
import { EntityAowCardComponent } from './components/entity-aow-card/entity-aow-card.component';
import { EntityResultsByIndicatorCategoryCardComponent } from './components/entity-results-by-indicator-category-card/entity-results-by-indicator-category-card.component';

@Component({
  selector: 'app-entity-details',
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    RouterModule,
    ProgressBarModule,
    EntityAowCardComponent,
    EntityResultsByIndicatorCategoryCardComponent
  ],
  templateUrl: './entity-details.component.html',
  styleUrl: './entity-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDetailsComponent implements OnInit {
  api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  entityId = signal<string>('');
  entityAows = signal<any[]>([
    {
      aowCode: 'AOW00',
      aowName: 'Cross-Cutting and Management',
      progress: 80
    },
    {
      aowCode: 'AOW01',
      aowName: 'Market Intelligence',
      progress: 60
    },
    {
      aowCode: 'AOW02',
      aowName: 'Accelerated Breeding',
      progress: 20
    }
  ]);

  entityResultsByIndicatorCategory = signal<any[]>([
    {
      indicatorType: 1,
      indicatorName: 'Capacity Sharing for Development',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    }
  ]);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityId.set(params['id']);
    });
  }
}
