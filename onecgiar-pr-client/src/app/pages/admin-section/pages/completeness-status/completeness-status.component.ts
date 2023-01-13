import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-completeness-status',
  templateUrl: './completeness-status.component.html',
  styleUrls: ['./completeness-status.component.scss']
})
export class CompletenessStatusComponent {
  resultsList: any[];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.GET_reportSesultsCompleteness();
  }
  GET_reportSesultsCompleteness() {
    this.api.resultsSE.GET_reportSesultsCompleteness().subscribe(({ response }) => {
      this.resultsList = response;
      console.log(response);
    });
  }
}
