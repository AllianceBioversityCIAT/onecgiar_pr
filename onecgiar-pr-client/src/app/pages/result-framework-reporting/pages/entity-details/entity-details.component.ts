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

  summaryInsightsData = signal([
    {
      label: 'Editing results',
      value: 126,
      icon: '../../../../../assets/result-framework-reporting/editing_results.png'
    },
    {
      label: 'Submitted results',
      value: 102,
      icon: '../../../../../assets/result-framework-reporting/submitted_results.png'
    },
    {
      label: 'Quality assessed results',
      value: 40,
      icon: '../../../../../assets/result-framework-reporting/quality_assessed_results.png'
    }
  ]);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.entityId.set(params['entityId']);
    });
    this.entityAowService.getAllDetailsData();
  }
}
