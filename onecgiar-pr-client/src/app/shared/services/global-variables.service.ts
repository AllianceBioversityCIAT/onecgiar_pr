import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GlobalVariablesService {
  get: GlobalVariables = {};
}

export interface GlobalVariables {
  in_qa?: boolean;
  ipsr_is_closed?: boolean;
  result_is_closed?: boolean;
}
