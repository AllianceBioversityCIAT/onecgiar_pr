import { Injectable } from '@angular/core';
@Injectable({
  providedIn: 'root'
})
export class IpsrDataControlService {
  detailData: DetailData = null;
  resultInnovationCode = null;
  resultInnovationId = null;
  constructor() {}
}

interface DetailData {
  result_id: string;
  result_code: string;
  title: string;
  official_code: string;
  result_level: string;
  result_type: string;
}
