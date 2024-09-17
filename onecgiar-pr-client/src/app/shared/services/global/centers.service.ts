import { EventEmitter, Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { CenterDto } from '../../interfaces/center.dto';

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  centersList: CenterDto[] = [];
  loadedCenters: EventEmitter<boolean> = new EventEmitter();

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
          this.loadedCenters.emit(true);
        },
        error: err => {
          reject(err);
        }
      });
    });
  }
}
