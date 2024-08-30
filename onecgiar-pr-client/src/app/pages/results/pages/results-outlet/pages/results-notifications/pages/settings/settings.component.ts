import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ResultsNotificationsService } from '../../results-notifications.service';

@Component({
  selector: 'app-settings',

  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  description = `Information to keep in mind: <ul><li>Please check if you really want to disable any option</li><li>It is possible to enable/disable the options as you wish</li></ul>`;
  emailNotifications = false;
  systemNotifications = false;
  isLoading = false;
  isSaving = false;

  constructor(
    public api: ApiService,
    public router: Router,
    public activatedRoute: ActivatedRoute,
    public resultsNotificationsSE: ResultsNotificationsService
  ) {}

  ngOnInit() {
    if (!this.activatedRoute.snapshot.queryParams['init']) {
      this.router.navigate(['result/results-outlet/results-notifications/settings'], {
        queryParams: { init: this.api.dataControlSE?.myInitiativesList[0]?.id }
      });
    }

    if (this.activatedRoute.snapshot.queryParams['init']) {
      this.getNotificationSettings(this.activatedRoute.snapshot.queryParams['init']);
    }
  }

  getNotificationSettings(initiativeId: string) {
    this.isLoading = true;

    this.api.resultsSE.GET_userNotificationSettingsByInitiativeId(initiativeId).subscribe({
      next: ({ response }) => {
        this.emailNotifications = response?.email_notifications_contributing_request_enabled;
        this.systemNotifications = response?.email_notifications_updates_enabled;
        this.isLoading = false;
      },
      error: err => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  handleInitiative(initiative: any) {
    if (!initiative || this.isLoading || this.isSaving) return;

    this.router.navigate(['result/results-outlet/results-notifications/settings'], {
      queryParams: { init: initiative?.id }
    });

    this.emailNotifications = false;
    this.systemNotifications = false;
    this.getNotificationSettings(initiative?.id);
  }

  onSaveSection() {
    if (this.isSaving || !this.activatedRoute.snapshot.queryParams['init']) return;

    this.isSaving = true;

    this.api.resultsSE
      .PATCH_userNotificationSettingsByInitiativeId({
        initiative_id: this.activatedRoute.snapshot.queryParams['init'],
        email_notifications_contributing_request_enabled: this.emailNotifications,
        email_notifications_updates_enabled: this.systemNotifications
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.getNotificationSettings(this.activatedRoute.snapshot.queryParams['init']);
        },
        error: err => {
          console.error(err);
          this.isSaving = false;
        }
      });
  }
}
