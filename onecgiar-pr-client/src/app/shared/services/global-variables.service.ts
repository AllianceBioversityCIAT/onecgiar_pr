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
  show_global_info?: boolean;
  global_info_message?: string;
  t1r_default_phase?: string;
}
