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

  async getData(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.centersList?.length) return resolve(JSON.parse(JSON.stringify(this.centersList)));
      this.api.resultsSE.GET_AllCLARISACenters().subscribe({
        next: ({ response }) => {
          resolve([...response]);
          this.centersList = response;
        },
        error: err => {
          reject(err);
        }
      });
    });
  }
}
