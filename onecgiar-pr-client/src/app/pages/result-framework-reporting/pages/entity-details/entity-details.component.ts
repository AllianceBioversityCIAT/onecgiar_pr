import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressBarModule } from 'primeng/progressbar';
import { EntityAowCardComponent } from './components/entity-aow-card/entity-aow-card.component';
import { EntityResultsByIndicatorCategoryCardComponent } from './components/entity-results-by-indicator-category-card/entity-results-by-indicator-category-card.component';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-entity-details',
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    RouterModule,
    ProgressBarModule,
    EntityAowCardComponent,
    EntityResultsByIndicatorCategoryCardComponent,
    SkeletonModule
  ],
  templateUrl: './entity-details.component.html',
  styleUrl: './entity-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  api = inject(ApiService);
  entityAowService = inject(EntityAowService);

  entityResultsByIndicatorCategory = signal<any[]>([
    {
      indicatorType: 7,
      indicatorName: 'Innovation Development',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    },
    {
      indicatorType: 6,
      indicatorName: 'Knowledge Products',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    },
    {
      indicatorType: 5,
      indicatorName: 'Capacity Sharing for Development',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    },
    {
      indicatorType: 2,
      indicatorName: 'Innovation Use',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    },
    {
      indicatorType: 1,
      indicatorName: 'Policy Change',
      resultsEditing: 80,
      resultsSubmitted: 50,
      resultsQualityAssessed: 30
    }
  ]);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.entityId.set(params['entityId']);
    });
    this.entityAowService.getAllDetailsData();
  }
}
