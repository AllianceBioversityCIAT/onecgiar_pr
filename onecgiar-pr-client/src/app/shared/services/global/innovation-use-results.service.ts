import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InnovationUseResultsService {
  resultsList = [];
  
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_innovationUseResults().subscribe(({ response }) => {
      this.resultsList = [
        {
          name: 'P25',
          options: response.P25 || []
        },
        {
          name: 'P22-P24 - Innovation Use',
          options: response['P22-P24']?.[0]?.['innovation-use'] || []
        },
        {
          name: 'P22-P24 - Innovation Development',
          options: response['P22-P24']?.[0]?.['innovation-development'] || []
        }
      ];
      
    });
  }
}


