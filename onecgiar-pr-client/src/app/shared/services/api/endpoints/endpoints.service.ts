import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EndpointsService {
  constructor(public http: HttpClient) {}
  apiBaseUrl = environment.apiBaseUrl + 'api/results/';
  resultFolders(phase) {
    return this.http.get<any>(`${this.apiBaseUrl}result-folders?type=type-one-report&status=active&phase=${phase}`);
  }
}
