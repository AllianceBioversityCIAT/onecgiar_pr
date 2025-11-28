import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

interface ResultItem {
  code: string;
  title: string;
  indicator_category: string;
  status: string;
  toc_result: string;
  indicator: string;
  submission_date: string;
}

interface GroupedResult {
  group_title: string;
  results: ResultItem[];
}

@Component({
  selector: 'app-results-review-table',
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule],
  templateUrl: './results-review-table.component.html',
  styleUrl: './results-review-table.component.scss'
})
export class ResultsReviewTableComponent {
  // Dummy data basado en las imágenes
  tableData = signal<GroupedResult[]>([
    {
      group_title: 'V0165-ACIAR-ICCCAD',
      results: [
        {
          code: '3817',
          title: 'Implementation of conservation agriculture in Africa and Asia',
          indicator_category: 'Policy Change',
          status: 'Pending review',
          toc_result: 'AOW01 - Evidence generated to support policy development in Africa and Asia',
          indicator: 'Number of farmers adopting new learning resources',
          submission_date: '19/08/2025'
        },
        {
          code: '3816',
          title: 'TEST - Farmers trained on protection against wheat disease apply climate',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW04 - 2030 Outcome - Small-scale producers and other actors use climate advisory services, early warning or...',
          indicator: 'Number of small-scale producers and/or other FLW system actors using climate services, EWS, or...',
          submission_date: '20/08/2025'
        },
        {
          code: '2417',
          title: 'Establishment of agricultural cooperatives in communities',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW05 - Climate-smart farming innovations with evidence at scale',
          indicator: 'Number of innovations sessions on smart practices delivered',
          submission_date: '18/08/2025'
        },
        {
          code: '2416',
          title: 'Market linkages for producers in another region',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW05 - Climate-smart farming innovations with evidence at scale',
          indicator: 'Number of agricultural innovation trials conducted',
          submission_date: '17/08/2025'
        }
      ]
    },
    {
      group_title: 'V0234-CIMMYT-WHEAT',
      results: [
        {
          code: '5621',
          title: 'Drought-resistant wheat varieties for smallholder farmers',
          indicator_category: 'Knowledge Product',
          status: 'Pending review',
          toc_result: 'AOW02 - New wheat varieties adopted by farmers in target regions',
          indicator: 'Number of farmers adopting drought-resistant varieties',
          submission_date: '22/08/2025'
        },
        {
          code: '5620',
          title: 'Capacity building for seed multiplication systems',
          indicator_category: 'Capacity Development',
          status: 'Pending review',
          toc_result: 'AOW03 - Enhanced seed systems supporting wheat production',
          indicator: 'Number of seed producers trained in multiplication techniques',
          submission_date: '21/08/2025'
        },
        {
          code: '5619',
          title: 'Disease surveillance network for wheat rust monitoring',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW06 - Early warning systems for wheat diseases implemented',
          indicator: 'Number of surveillance stations operational',
          submission_date: '20/08/2025'
        }
      ]
    },
    {
      group_title: 'V0412-IRRI-RICE',
      results: [
        {
          code: '7834',
          title: 'Climate-smart rice production practices in Southeast Asia',
          indicator_category: 'Policy Change',
          status: 'Pending review',
          toc_result: 'AOW07 - Policies supporting sustainable rice production adopted',
          indicator: 'Number of policy instruments influenced by research',
          submission_date: '25/08/2025'
        },
        {
          code: '7833',
          title: 'Water-saving technologies for rice farming',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW08 - Water-efficient irrigation systems developed and tested',
          indicator: 'Number of water-saving technologies validated',
          submission_date: '24/08/2025'
        },
        {
          code: '7832',
          title: 'Rice value chain enhancement through digital platforms',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW09 - Digital tools adopted by rice farmers and traders',
          indicator: 'Number of farmers using digital market platforms',
          submission_date: '23/08/2025'
        },
        {
          code: '7831',
          title: 'Nutrient management strategies for sustainable rice intensification',
          indicator_category: 'Knowledge Product',
          status: 'Pending review',
          toc_result: 'AOW10 - Best practices for nutrient management disseminated',
          indicator: 'Number of extension materials distributed to farmers',
          submission_date: '22/08/2025'
        }
      ]
    }
  ]);

  // Configuración para expandir todas las filas por defecto
  expandedRowKeys = computed(() => {
    const expanded: { [key: string]: boolean } = {};
    this.tableData().forEach((item: GroupedResult) => {
      expanded[item.group_title] = true;
    });
    return expanded;
  });

  // Acción del botón
  reviewResult(result: ResultItem): void {
    // TODO: Implement review result logic
  }
}
