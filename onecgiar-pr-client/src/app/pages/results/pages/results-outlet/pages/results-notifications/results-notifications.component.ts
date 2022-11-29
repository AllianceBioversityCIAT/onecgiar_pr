import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-results-notifications',
  templateUrl: './results-notifications.component.html',
  styleUrls: ['./results-notifications.component.scss']
})
export class ResultsNotificationsComponent {
  notificationsList = [1, 2, 3];
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.get_section_information();
  }

  get_section_information() {
    this.api.resultsSE.GET_allRequest().subscribe(({ response }) => {
      console.log(response);
      this.notificationsList = response;
    });
    this.api.resultsSE.GET_requestStatus().subscribe(resp => {
      console.log(resp);
    });
  }
}
