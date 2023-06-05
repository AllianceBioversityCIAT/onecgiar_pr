import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class RegionsCountriesService {
  regionsList = [];
  countriesList = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_AllCLARISARegions().subscribe(({ response }) => {
      this.regionsList = response;
      //(response);
    });
    this.api.resultsSE.GET_AllCLARISACountries().subscribe(({ response }) => {
      this.countriesList = response;
      //(response);
    });
  }
}
