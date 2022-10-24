import { Injectable } from '@angular/core';
import { ResultItem } from '../interfaces/result.interface';

@Injectable({
  providedIn: 'root'
})
export class DataControlService {
  myInitiativesList = [];
  resultsList: ResultItem[];
  constructor() {}
  validateBody(body: any) {
    return Object.entries(body).every((item: any) => item[1]);
  }
  myInitiativesListText(initiatives) {
    let result = '';
    initiatives?.map((item, index) => {
      result += item.name + (index + 1 < initiatives?.length ? ', ' : '');
    });
    return result;
  }
}
