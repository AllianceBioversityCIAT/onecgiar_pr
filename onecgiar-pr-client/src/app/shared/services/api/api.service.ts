import { Injectable } from '@angular/core';
import { ResultsApiService } from './results-api.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(public resultsApiService: ResultsApiService) {}
}
