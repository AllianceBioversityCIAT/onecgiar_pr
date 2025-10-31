import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MappedResultsModalServiceService {
  mappedResultsModal = false;
  isTarget = false;
  activeTab = {
    toc_result_id: '',
    initiative_id: '',
    result_code: '',
    title: '',
    result_type: '',
    phase_name: '',
    contributing_indicator: '',
    progress_narrative: ''
  };

  targetData = {
    statement: '',
    measure: '',
    overall: '',
    date: '',
    contributors: []
  };

  columnsOrder = [];
}
