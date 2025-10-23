import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ProgressBarModule } from 'primeng/progressbar';
import { EntityAowCardComponent } from './components/entity-aow-card/entity-aow-card.component';
import { EntityResultsByIndicatorCategoryCardComponent } from './components/entity-results-by-indicator-category-card/entity-results-by-indicator-category-card.component';
import { EntityAowService } from '../entity-aow/services/entity-aow.service';
import { SkeletonModule } from 'primeng/skeleton';
import { ChartModule } from 'primeng/chart';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart } from 'chart.js';

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
    SkeletonModule,
    ChartModule
  ],
  templateUrl: './entity-details.component.html',
  styleUrl: './entity-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  api = inject(ApiService);
  entityAowService = inject(EntityAowService);

  cd = inject(ChangeDetectorRef);

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
    this.initChart();
  }

  dataOutputs: any;
  dataOutcomes: any;
  options: any;

  platformId = inject(PLATFORM_ID);

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      Chart.register(ChartDataLabels);

      this.dataOutputs = {
        labels: ['Knowledge product', 'Innovation development', 'Capacity sharing for development', 'Other output'],
        datasets: [
          {
            type: 'bar',
            label: 'Editing',
            backgroundColor: '#60a5fa',
            data: [42, 30, 10, 5]
          },
          {
            type: 'bar',
            label: 'Submitted',
            backgroundColor: '#8e9be8',
            data: [25, 18, 12, 0]
          },
          {
            type: 'bar',
            label: 'Quality assessed',
            backgroundColor: '#5569dd',
            data: [5, 4, 10, 1]
          }
        ]
      };

      this.dataOutcomes = {
        labels: ['Policy change', 'Innovation use', 'Other outcome'],
        datasets: [
          {
            type: 'bar',
            label: 'Editing',
            backgroundColor: '#60a5fa',
            data: [14, 15, 10]
          },
          {
            type: 'bar',
            label: 'Submitted',
            backgroundColor: '#8e9be8',
            data: [17, 18, 12]
          },
          {
            type: 'bar',
            label: 'Quality assessed',
            backgroundColor: '#5569dd',
            data: [5, 4, 10]
          }
        ]
      };

      this.options = {
        responsive: true,
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        indexAxis: 'y',
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: true
          },
          datalabels: {
            color: '#fff',
            font: {
              weight: '400',
              size: 9
            },
            formatter: (value: number) => {
              return value > 1 ? value : '';
            },
            anchor: 'center',
            align: 'center'
          },
          legend: {
            labels: {
              boxWidth: 10,
              font: {
                size: 8
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            ticks: {
              font: {
                size: 8
              },
              padding: 0,
              minRotation: 45
            }
          },
          y: {
            stacked: true,
            ticks: {
              font: {
                size: 8
              },
              padding: 0
            }
          }
        }
      };
      this.cd.markForCheck();
    }
  }
}
