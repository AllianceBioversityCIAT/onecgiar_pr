import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  centersList = [];
  constructor(private api: ApiService) {
    this.getData();
  }
  async getCentersList() {
    if (!this.centersList?.length) await this.getData();
    return this.centersList;
  }

  async getData() {
    return new Promise((resolve, reject) => {
      this.api.resultsSE.GET_AllCLARISACenters().subscribe(
        ({ response }) => {
          this.centersList = response;
          //(response);
          resolve(response);
        },
        err => {
          reject(err);
        }
      );
    });
  }
}
