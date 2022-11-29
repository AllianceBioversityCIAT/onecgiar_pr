import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResultsListService {
  text_to_search: string = '';
  constructor() {}
}
