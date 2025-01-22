import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ButtonModule } from 'primeng/button';
import { CustomSpinnerModule } from '../../../../shared/components/custom-spinner/custom-spinner.module';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterIndicatorBySearchPipe } from '../../pipes/filter-indicator-by-search.pipe';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-eioi-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, CustomSpinnerModule, RouterLink, FilterIndicatorBySearchPipe, FormsModule, TooltipModule],
  templateUrl: './eoio-home.component.html',
  styleUrl: './eoio-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EoioHomeComponent implements OnDestroy, OnInit {
  api = inject(ApiService);
  outcomeIService = inject(OutcomeIndicatorService);
  activatedRoute = inject(ActivatedRoute);

  ngOnInit(): void {
    this.api.dataControlSE.detailSectionTitle('End of initiative outcome indicators list');
  }

  ngOnDestroy(): void {
    this.outcomeIService.searchText.set('');
    this.api.dataControlSE.detailSectionTitle('Outcome indicator module');
  }
}
