import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';

@Component({
  selector: 'app-received-requests',
  templateUrl: './received-requests.component.html',
  styleUrls: ['./received-requests.component.scss']
})
export class ReceivedRequestsComponent implements OnInit {
  notificationMockData = {
    share_result_request_id: 2615,
    is_active: 1,
    requested_date: '2024-07-16T15:37:03.194Z',
    aprovaed_date: null,
    result_id: '7699',
    result_code: '3869',
    owner_initiative_id: 5,
    shared_inititiative_id: 36,
    approving_inititiative_id: 36,
    approving_official_code: 'PLAT-01',
    approving_short_name: 'GENDER Impact Platform 4',
    requester_initiative_id: 5,
    requester_official_code: 'INIT-05',
    requester_short_name: 'Market Intelligence',
    toc_result_id: null,
    action_area_outcome_id: null,
    request_status_id: 1,
    requested_by: 307,
    requested_first_name: 'Juan David',
    requested_last_name: 'Delgado',
    approved_by: null,
    approved_first_name: null,
    approved_last_name: null,
    planned_result: null,
    description:
      'The G+ approach for gender-responsive breeding, developed by CGIAR scientists since 2018, offers an integrated, systematic, and evidence-based protocol for breeding new crop varieties. The approach builds on work by the CGIAR Excellence in Breeding (EiB) Platform on the concept of a “product profile”, which describes the traits that different actors want in a new variety, giving plant breeders a target. The G+ approach complements this with two additional tools. The G+ plus customer profile characterizes client groups targeted for new varieties, considering gender differences in knowledge, assets, and decision-making which influence adoption. This makes it easier for breeders to develop the right product for the right customers.  ',
    title: 'G+ tools: gender-responsive systematic customer and product profiling for breeding programs ',
    status: 0,
    status_id: '1',
    status_name: 'Editing',
    result_level_id: 4,
    result_type_id: 7,
    result_type_name: 'Innovation development',
    result_level_name: 'Initiative output',
    is_requester: '0',
    version_status: 1,
    version_id: '30',
    phase_year: 2024
  };
  notificationMockData1 = {
    share_result_request_id: 2615,
    is_active: 1,
    requested_date: '2024-07-16T15:37:03.194Z',
    aprovaed_date: null,
    result_id: '7699',
    result_code: '3869',
    owner_initiative_id: 5,
    shared_inititiative_id: 36,
    approving_inititiative_id: 36,
    approving_official_code: 'PLAT-01',
    approving_short_name: 'GENDER Impact Platform 4',
    requester_initiative_id: 5,
    requester_official_code: 'INIT-05',
    requester_short_name: 'Market Intelligence',
    toc_result_id: null,
    action_area_outcome_id: null,
    request_status_id: 3,
    requested_by: 307,
    requested_first_name: 'Juan David',
    requested_last_name: 'Delgado',
    approved_by: null,
    approved_first_name: null,
    approved_last_name: null,
    planned_result: null,
    description:
      'The G+ approach for gender-responsive breeding, developed by CGIAR scientists since 2018, offers an integrated, systematic, and evidence-based protocol for breeding new crop varieties. The approach builds on work by the CGIAR Excellence in Breeding (EiB) Platform on the concept of a “product profile”, which describes the traits that different actors want in a new variety, giving plant breeders a target. The G+ approach complements this with two additional tools. The G+ plus customer profile characterizes client groups targeted for new varieties, considering gender differences in knowledge, assets, and decision-making which influence adoption. This makes it easier for breeders to develop the right product for the right customers.  ',
    title: 'G+ tools: gender-responsive systematic customer and product profiling for breeding programs ',
    status: 0,
    status_id: '1',
    status_name: 'Editing',
    result_level_id: 4,
    result_type_id: 7,
    result_type_name: 'Innovation development',
    result_level_name: 'Initiative output',
    is_requester: '0',
    version_status: 1,
    version_id: '30',
    phase_year: 2024
  };

  constructor(public api: ApiService, public resultsNotificationsSE: ResultsNotificationsService) {}

  ngOnInit(): void {
    this.api.updateUserData(() => {
      this.resultsNotificationsSE.get_section_information();
    });
  }
}
