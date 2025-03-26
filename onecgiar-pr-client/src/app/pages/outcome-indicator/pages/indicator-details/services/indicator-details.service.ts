import { Injectable, signal } from '@angular/core';
import { IndicatorData } from '../models/indicator-data.model';
import { ResultsApiService } from '../../../../../shared/services/api/results-api.service';
import { AuthService } from '../../../../../shared/services/api/auth.service';

@Injectable({
  providedIn: 'root'
})
export class IndicatorDetailsService {
  indicatorData = signal<IndicatorData>(new IndicatorData());
  indicatorId = signal<string>('');
  platformId = signal<string>('');

  // Modal
  indicatorResultsModal = signal<{ value: boolean }>({ value: false });
  textToSearch = signal<{ value: string }>({ value: '' });
  indicatorResults = signal<any[] | null>(null);

  constructor(
    private readonly resultsApiService: ResultsApiService,
    private readonly authSE: AuthService
  ) {}

  getIndicatorDetailsResults() {
    this.resultsApiService.GET_contributionsDetailsResults(this.authSE.localStorageUser.id).subscribe(contributionsRes => {
      contributionsRes.response.forEach(result => {
        if (this.indicatorData().contributing_results.some(r => r.result_id === result.id)) {
          result.is_added = true;
          result.is_saved = true;
        }
      });

      this.resultsApiService.GETAllInnovationPackages().subscribe(innovationRes => {
        innovationRes.response.forEach(result => {
          if (this.indicatorData().contributing_results.some(r => r.result_id === result.id)) {
            result.is_added = true;
            result.is_saved = true;
          }
          result.status_name = result.status;
          result.submitter = result.official_code;
        });

        const mergedResults = [...contributionsRes.response, ...innovationRes.response];
        this.indicatorResults.set(mergedResults);
      });
    });
  }
}
