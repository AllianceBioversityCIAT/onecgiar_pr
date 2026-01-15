import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ResultReviewDrawerComponent, ResultToReview } from './components/result-review-drawer/result-review-drawer.component';

interface GroupedResult {
  group_title: string;
  results: ResultToReview[];
}

@Component({
  selector: 'app-results-review-table',
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, ResultReviewDrawerComponent],
  templateUrl: './results-review-table.component.html',
  styleUrl: './results-review-table.component.scss'
})
export class ResultsReviewTableComponent {
  showReviewDrawer = signal<boolean>(false);
  currentResultToReview = signal<ResultToReview | null>(null);

  // Dummy data con información MDS variada
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
          toc_result_id: 'aow01',
          indicator: 'Number of farmers adopting new learning resources',
          indicator_id: 'ind02',
          submission_date: '19/08/2025',
          submitted_by: 'John Smith',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0165-ACIAR-ICCCAD',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Conservation agriculture practices were successfully implemented across multiple regions in Africa and Asia, focusing on soil health improvement and sustainable farming techniques.',
          geographic_scope: 'regional',
          regions: ['africa', 'eastern_africa', 'asia'],
          countries: ['kenya', 'ethiopia', 'india']
        },
        {
          code: '3816',
          title: 'TEST - Farmers trained on protection against wheat disease apply CGIAR innovation in their work',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW04 - 2030 Outcome - Small-scale producers and other actors use climate advisory services, early warning or...',
          toc_result_id: 'aow04',
          indicator: 'Number of small-scale producers and/or other FLW system actors using climate services, EWS, or...',
          indicator_id: 'ind01',
          submission_date: '20/08/2025',
          submitted_by: 'Nicoleta Trifa',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0165-ACIAR-ICCCAD',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Farmers from Latin America are trained to use an innovative method which alerts them when a disease might be spreading in the wheat fields.',
          geographic_scope: 'global',
          regions: ['africa', 'western_africa', 'eastern_africa', 'northern_africa'],
          countries: []
        },
        {
          code: '2417',
          title: 'Establishment of agricultural cooperatives in communities',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW05 - Climate-smart farming innovations with evidence at scale',
          toc_result_id: 'aow05',
          indicator: 'Number of innovations sessions on smart practices delivered',
          indicator_id: 'ind04',
          submission_date: '18/08/2025',
          submitted_by: 'Maria Garcia',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0165-ACIAR-ICCCAD',
          // MDS fields
          toc_alignment: false,
          result_description:
            'New agricultural cooperatives established to improve market access and collective bargaining power for smallholder farmers in rural communities.',
          geographic_scope: 'country',
          regions: ['latin_america', 'central_america'],
          countries: ['mexico', 'colombia']
        },
        {
          code: '2416',
          title: 'Market linkages for producers in another region',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW05 - Climate-smart farming innovations with evidence at scale',
          toc_result_id: 'aow05',
          indicator: 'Number of agricultural innovation trials conducted',
          indicator_id: 'ind04',
          submission_date: '17/08/2025',
          submitted_by: 'Carlos Rodriguez',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0165-ACIAR-ICCCAD',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Established direct market linkages between small-scale producers and regional buyers, reducing intermediary costs and improving farmer income.',
          geographic_scope: 'sub_national',
          regions: ['southern_africa'],
          countries: ['tanzania', 'uganda']
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
          toc_result_id: 'aow02',
          indicator: 'Number of farmers adopting drought-resistant varieties',
          indicator_id: 'ind05',
          submission_date: '22/08/2025',
          submitted_by: 'Emma Wilson',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0234-CIMMYT-WHEAT',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Development and distribution of new drought-resistant wheat varieties specifically adapted for smallholder farming conditions in semi-arid regions.',
          geographic_scope: 'regional',
          regions: ['asia', 'south_asia'],
          countries: ['india', 'bangladesh']
        },
        {
          code: '5620',
          title: 'Capacity building for seed multiplication systems',
          indicator_category: 'Capacity Development',
          status: 'Pending review',
          toc_result: 'AOW03 - Enhanced seed systems supporting wheat production',
          toc_result_id: 'aow03',
          indicator: 'Number of seed producers trained in multiplication techniques',
          indicator_id: 'ind06',
          submission_date: '21/08/2025',
          submitted_by: 'David Brown',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0234-CIMMYT-WHEAT',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Training programs delivered to local seed producers on quality seed multiplication techniques and certification processes.',
          geographic_scope: 'country',
          regions: ['africa'],
          countries: ['nigeria', 'ghana']
        },
        {
          code: '5619',
          title: 'Disease surveillance network for wheat rust monitoring',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW06 - Early warning systems for wheat diseases implemented',
          toc_result_id: 'aow06',
          indicator: 'Number of surveillance stations operational',
          indicator_id: 'ind07',
          submission_date: '20/08/2025',
          submitted_by: 'Sarah Johnson',
          entity_acronym: 'CIMMYT',
          entity_code: 'V0234-CIMMYT-WHEAT',
          // MDS fields
          toc_alignment: false,
          result_description:
            'Establishment of a comprehensive disease surveillance network across wheat-producing regions to monitor and report wheat rust outbreaks in real-time.',
          geographic_scope: 'global',
          regions: ['africa', 'asia', 'europe'],
          countries: ['kenya', 'ethiopia', 'india']
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
          toc_result_id: 'aow07',
          indicator: 'Number of policy instruments influenced by research',
          indicator_id: 'ind03',
          submission_date: '25/08/2025',
          submitted_by: 'Ana Martinez',
          entity_acronym: 'IRRI',
          entity_code: 'V0412-IRRI-RICE',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Policy recommendations for climate-smart rice production have been incorporated into national agricultural strategies of Southeast Asian countries.',
          geographic_scope: 'regional',
          regions: ['asia', 'southeast_asia'],
          countries: ['vietnam', 'philippines', 'thailand']
        },
        {
          code: '7833',
          title: 'Water-saving technologies for rice farming',
          indicator_category: 'Innovation Development',
          status: 'Pending review',
          toc_result: 'AOW08 - Water-efficient irrigation systems developed and tested',
          toc_result_id: 'aow08',
          indicator: 'Number of water-saving technologies validated',
          indicator_id: 'ind08',
          submission_date: '24/08/2025',
          submitted_by: 'James Lee',
          entity_acronym: 'IRRI',
          entity_code: 'V0412-IRRI-RICE',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Development and field testing of alternate wetting and drying (AWD) technology for water-efficient rice production.',
          geographic_scope: 'country',
          regions: ['southeast_asia'],
          countries: ['indonesia', 'vietnam']
        },
        {
          code: '7832',
          title: 'Rice value chain enhancement through digital platforms',
          indicator_category: 'Innovation Use',
          status: 'Pending review',
          toc_result: 'AOW09 - Digital tools adopted by rice farmers and traders',
          toc_result_id: 'aow09',
          indicator: 'Number of farmers using digital market platforms',
          indicator_id: 'ind09',
          submission_date: '23/08/2025',
          submitted_by: 'Linda Chen',
          entity_acronym: 'IRRI',
          entity_code: 'V0412-IRRI-RICE',
          // MDS fields
          toc_alignment: true,
          result_description:
            'Digital platform connecting rice farmers directly with buyers, providing real-time market prices and reducing post-harvest losses.',
          geographic_scope: 'sub_national',
          regions: ['south_asia'],
          countries: ['bangladesh', 'india']
        },
        {
          code: '7831',
          title: 'Nutrient management strategies for sustainable rice intensification',
          indicator_category: 'Knowledge Product',
          status: 'Pending review',
          toc_result: 'AOW10 - Best practices for nutrient management disseminated',
          toc_result_id: 'aow10',
          indicator: 'Number of extension materials distributed to farmers',
          indicator_id: 'ind10',
          submission_date: '22/08/2025',
          submitted_by: 'Michael Wang',
          entity_acronym: 'IRRI',
          entity_code: 'V0412-IRRI-RICE',
          // MDS fields
          toc_alignment: false,
          result_description:
            'Comprehensive nutrient management guidelines developed and disseminated to extension workers and farmers for sustainable rice intensification.',
          geographic_scope: 'tbd',
          regions: [],
          countries: []
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

  // Acción del botón para abrir el drawer de review
  reviewResult(result: ResultToReview): void {
    this.currentResultToReview.set(result);
    this.showReviewDrawer.set(true);
  }
}
