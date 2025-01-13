import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../../shared/services/api/api.service';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { FormsModule } from '@angular/forms';
import { FilterIndicatorBySearchPipe } from '../../pipes/filter-indicator-by-search.pipe';
import { CustomSpinnerModule } from '../../../../shared/components/custom-spinner/custom-spinner.module';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-wp-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CustomSpinnerModule, RouterLink, FilterIndicatorBySearchPipe, FormsModule, TooltipModule],
  templateUrl: './wp-home.component.html',
  styleUrl: './wp-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WpHomeComponent implements OnDestroy, OnInit {
  api = inject(ApiService);
  outcomeIService = inject(OutcomeIndicatorService);
  activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('Work package outcome indicators list');
  }

  ngOnDestroy(): void {
    this.outcomeIService.searchText.set('');
  }
}
