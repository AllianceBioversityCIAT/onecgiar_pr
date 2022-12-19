import { Injectable } from '@angular/core';
import { RetrieveRequestBody } from './models/RetrieveRequestBody.model';

@Injectable({
  providedIn: 'root'
})
export class RetrieveModalService {
  title = '';
  retrieveRequestBody = new RetrieveRequestBody();
  constructor() {}
}
