import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ResultCreatorModule } from '../../../results/pages/result-creator/result-creator.module';
import { MenuItem } from 'primeng/api';
import { BilateralResultsReviewComponent } from './components/bilateral-results-review/bilateral-results-review.component';

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
    ChartModule,
    ButtonModule,
    DialogModule,
    SplitButtonModule,
    ResultCreatorModule,
    BilateralResultsReviewComponent
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

  showReportModal = signal(false);
  reportMenuItems: MenuItem[] = [
    {
      label: 'AI Assistant',
      icon: 'pi pi-sparkles',
      disabled: true
    },
    {
      separator: true
    },
    {
      label: 'Unplanned result',
      icon: 'pi pi-file-plus',
      command: () => {
        this.showReportModal.set(true);
      }
    }
  ];

  summaryInsightsData = computed(() => {
    return [
      {
        label: this.entityAowService.dashboardData()?.editing?.label,
        value: this.entityAowService.dashboardData()?.editing?.total,
        icon: '../../../../../assets/result-framework-reporting/editing_results.png'
      },
      {
        label: this.entityAowService.dashboardData()?.submitted?.label,
        value: this.entityAowService.dashboardData()?.submitted?.total,
        icon: '../../../../../assets/result-framework-reporting/submitted_results.png'
      },
      {
        label: this.entityAowService.dashboardData()?.qualityAssessed?.label,
        value: this.entityAowService.dashboardData()?.qualityAssessed?.total,
        icon: '../../../../../assets/result-framework-reporting/quality_assessed_results.png'
      }
    ];
  });

  dataOutputs = computed(() => {
    return {
      labels: ['Knowledge product', 'Innovation development', 'Capacity sharing for development', 'Other output'],
      datasets: [
        {
          type: 'bar',
          label: 'Editing',
          backgroundColor: 'rgba(153, 153, 153, 0.6)',
          hoverBackgroundColor: 'rgba(153, 153, 153, 0.6)',
          data: [
            this.entityAowService.dashboardData()?.editing?.data?.outputs?.knowledgeProduct,
            this.entityAowService.dashboardData()?.editing?.data?.outputs?.innovationDevelopment,
            this.entityAowService.dashboardData()?.editing?.data?.outputs?.capacitySharingForDevelopment,
            this.entityAowService.dashboardData()?.editing?.data?.outputs?.otherOutput
          ]
        },
        {
          type: 'bar',
          label: 'Submitted',
          backgroundColor: '#93C5FD',
          hoverBackgroundColor: '#93C5FD',
          data: [
            this.entityAowService.dashboardData()?.submitted?.data?.outputs?.knowledgeProduct,
            this.entityAowService.dashboardData()?.submitted?.data?.outputs?.innovationDevelopment,
            this.entityAowService.dashboardData()?.submitted?.data?.outputs?.capacitySharingForDevelopment,
            this.entityAowService.dashboardData()?.submitted?.data?.outputs?.otherOutput
          ]
        },
        {
          type: 'bar',
          label: 'Quality assessed',
          backgroundColor: '#38DF7B',
          hoverBackgroundColor: '#38DF7B',
          data: [
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outputs?.knowledgeProduct,
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outputs?.innovationDevelopment,
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outputs?.capacitySharingForDevelopment,
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outputs?.otherOutput
          ]
        }
      ]
    };
  });

  dataOutcomes = computed(() => {
    return {
      labels: ['Policy change', 'Innovation use', 'Other outcome'],
      datasets: [
        {
          type: 'bar',
          label: 'Editing',
          backgroundColor: 'rgba(153, 153, 153, 0.6)',
          hoverBackgroundColor: 'rgba(153, 153, 153, 0.6)',
          data: [
            this.entityAowService.dashboardData()?.editing?.data?.outcomes?.policyChange,
            this.entityAowService.dashboardData()?.editing?.data?.outcomes?.innovationUse,
            this.entityAowService.dashboardData()?.editing?.data?.outcomes?.otherOutcome
          ]
        },
        {
          type: 'bar',
          label: 'Submitted',
          backgroundColor: '#93C5FD',
          hoverBackgroundColor: '#93C5FD',
          data: [
            this.entityAowService.dashboardData()?.submitted?.data?.outcomes?.policyChange,
            this.entityAowService.dashboardData()?.submitted?.data?.outcomes?.innovationUse,
            this.entityAowService.dashboardData()?.submitted?.data?.outcomes?.otherOutcome
          ]
        },
        {
          type: 'bar',
          label: 'Quality assessed',
          backgroundColor: '#38DF7B',
          hoverBackgroundColor: '#38DF7B',
          data: [
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outcomes?.policyChange,
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outcomes?.innovationUse,
            this.entityAowService.dashboardData()?.qualityAssessed?.data?.outcomes?.otherOutcome
          ]
        }
      ]
    };
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.entityAowService.resetDashboardData();
      this.entityAowService.entityId.set(params['entityId']);
    });
    this.entityAowService.getAllDetailsData();
    this.entityAowService.getDashboardData();
    this.initChart();
  }

  options: any;

  platformId = inject(PLATFORM_ID);

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      Chart.register(ChartDataLabels);

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
