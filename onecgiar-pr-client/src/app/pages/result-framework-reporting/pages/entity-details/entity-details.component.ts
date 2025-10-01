import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressBarModule } from 'primeng/progressbar';
import { EntityAowCardComponent } from './components/entity-aow-card/entity-aow-card.component';
import { EntityResultsByIndicatorCategoryCardComponent } from './components/entity-results-by-indicator-category-card/entity-results-by-indicator-category-card.component';
import { Initiative, Unit } from './interfaces/entity-details.interface';
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
  api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  entityId = signal<string>('');
  entityDetails = signal<Initiative>({} as Initiative);
  entityAows = signal<Unit[]>([]);
  isLoading = signal<boolean>(false);

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
      this.entityId.set(params['id']);
    });
    this.getClarisaGlobalUnits();
  }

  getClarisaGlobalUnits() {
    this.isLoading.set(true);

    this.api.resultsSE.GET_ClarisaGlobalUnits(this.entityId()).subscribe(({ response }) => {
      this.entityDetails.set(response?.initiative);
      this.entityAows.set(response?.units ?? []);
      this.isLoading.set(false);
    });
  }
}
