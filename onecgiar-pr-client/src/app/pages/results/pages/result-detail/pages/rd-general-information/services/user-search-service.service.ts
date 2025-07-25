import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../../environments/environment';
import { UserSearchResponse } from '../models/userSearchResponse';

@Injectable({
  providedIn: 'root'
})
export class UserSearchService {
  selectedUser: any = null;
  searchQuery: string = '';
  hasValidContact: boolean = true;
  showContactError: boolean = false;

  constructor(private http: HttpClient) {}

  searchUsers(query: string): Observable<UserSearchResponse> {
    return this.http.get<UserSearchResponse>(`${environment.apiBaseUrl}auth/users/search?q=${query}`);
  }
}
