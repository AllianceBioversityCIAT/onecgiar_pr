import { Injectable } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';

interface Innovation {
  result_id: string;
  result_code: string;
  title: string;
  description: string;
  initiative_id: number;
  official_code: string;
  creation_date: string;
  innovation_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ManageInnovationsListService {
  allInnovationsList: Innovation[] = [];

  constructor(private api: ApiService) {}

  GETallInnovations(initiativesList) {
    const body = { initiativeId: [initiativesList] };

    this.api.resultsSE.GETallInnovations(body).subscribe(({ response }) => {
      this.allInnovationsList = response;
      this.allInnovationsList.forEach((inno: any) => (inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`));
    });
  }
}
