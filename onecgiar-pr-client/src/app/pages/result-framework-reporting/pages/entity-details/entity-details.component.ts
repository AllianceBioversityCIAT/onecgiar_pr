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
import { Chart, ChartData, ChartDataset, ChartOptions } from 'chart.js';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ResultCreatorModule } from '../../../results/pages/result-creator/result-creator.module';
import { MenuItem } from 'primeng/api';
import { ResultLevelService } from '../../../results/pages/result-creator/services/result-level.service';
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
  resultLevelSE = inject(ResultLevelService);

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

  private readonly axisPaddingValue = 10;

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
      }
    ];
  });

  dataOutputs = computed(() => {
    return {
      labels: ['Knowledge product', 'Innovation development', 'Capacity sharing for development', 'Other output'],
      datasets: [
        {
          type: 'bar' as const,
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
          type: 'bar' as const,
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
          type: 'bar' as const,
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
          type: 'bar' as const,
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
          type: 'bar' as const,
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
          type: 'bar' as const,
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

  chartOptionsOutputs = computed<ChartOptions<'bar'>>(() => this.buildChartOptions(this.dataOutputs()));
  chartOptionsOutcomes = computed<ChartOptions<'bar'>>(() => this.buildChartOptions(this.dataOutcomes()));

  groupedIndicatorSummaries = computed(() => {
    const summaries = this.entityAowService.indicatorSummaries().filter(
      item => item?.resultTypeName !== 'Innovation Use(IPSR)'
    );
    
    const outputs = summaries.filter(item => {
      const name = item?.resultTypeName || '';
      return name === 'Innovation development' ||
             name === 'Knowledge product' ||
             name === 'Capacity sharing for development' ||
             name === 'Other output';
    });

    const outcomes = summaries.filter(item => {
      const name = item?.resultTypeName || '';
      return name === 'Innovation use' ||
             name === 'Policy change' ||
             name === 'Other outcome';
    });

    return {
      outputs,
      outcomes
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

  platformId = inject(PLATFORM_ID);

  initChart() {
    if (isPlatformBrowser(this.platformId)) {
      Chart.register(ChartDataLabels);
      this.cd.markForCheck();
    }
  }

  private calculateDatasetMax(data: ChartData<'bar'>): number {
    return data.datasets.reduce((maxValue: number, dataset: ChartDataset<'bar'>) => {
      const values = (dataset.data as Array<number | null | undefined>) ?? [];
      const datasetMax = values.reduce((currentMax, value) => {
        const numericValue = typeof value === 'number' ? value : 0;
        return Math.max(currentMax, numericValue);
      }, 0);
      return Math.max(datasetMax, maxValue);
    }, 0);
  }

  private buildChartOptions(data: ChartData<'bar'>): ChartOptions<'bar'> {
    const dataMax = this.calculateDatasetMax(data);
    const axisMax = dataMax > 0 ? dataMax + this.axisPaddingValue : this.axisPaddingValue;

    return {
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
            weight: 400,
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
          max: axisMax,
          ticks: {
            font: {
              size: 8
            },
            padding: 0,
            minRotation: 45,
            stepSize: 1,
            precision: 0
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
  }

  onReportRequested(item: any) {
    this.resultLevelSE.setPendingResultType(item?.resultTypeId, item?.resultTypeName);
    this.showReportModal.set(true);
  }

  onModalClose() {
    this.showReportModal.set(false);
    this.resultLevelSE.cleanData?.();
  }
}
