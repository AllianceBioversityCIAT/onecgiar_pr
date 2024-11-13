import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CustomSpinnerModule } from '../../../../shared/components/custom-spinner/custom-spinner.module';
import { OutcomeIndicatorService } from '../../services/outcome-indicator.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterIndicatorBySearchPipe } from '../../pipes/filter-indicator-by-search.pipe';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-eioi-home',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, CustomSpinnerModule, RouterLink, FilterIndicatorBySearchPipe, FormsModule],
  templateUrl: './eoio-home.component.html',
  styleUrl: './eoio-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EoioHomeComponent {
  api = inject(ApiService);
  outcomeIService = inject(OutcomeIndicatorService);
  activatedRoute = inject(ActivatedRoute);

  achievedStatus(expectedTarget: number | null, achievedTarget: number | null): boolean {
    if (expectedTarget === null || achievedTarget === null) {
      return false;
    }
    return achievedTarget >= expectedTarget;
  }
}
