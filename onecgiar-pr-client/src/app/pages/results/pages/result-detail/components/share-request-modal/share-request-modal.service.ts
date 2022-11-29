import { Injectable } from '@angular/core';
import { ShareRequestBody } from './model/shareRequestBody.model';

@Injectable({
  providedIn: 'root'
})
export class ShareRequestModalService {
  shareRequestBody = new ShareRequestBody();
  constructor() {}
}
