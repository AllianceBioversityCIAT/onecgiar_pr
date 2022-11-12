import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  centersList = [];
  constructor(private api: ApiService) {
    this.api.resultsSE.GET_AllCLARISACenters().subscribe(({ response }) => {
      this.centersList = response;
      console.log(response);
    });
  }
}
