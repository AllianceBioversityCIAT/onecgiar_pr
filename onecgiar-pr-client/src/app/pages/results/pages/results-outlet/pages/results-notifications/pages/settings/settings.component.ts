import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  description = `Information to keep in mind: <ul><li>Please check if you really want to disable any option</li><li>It is possible to enable/disable the options as you wish</li></ul>`;
  emailNotifications = false;
  systemNotifications = false;
  settingsArray = [];
  isLoading = false;
  isSaving = false;

  private readonly INIT_QUERY_PARAM = 'init';
  private readonly SETTINGS_ROUTE = 'result/results-outlet/results-notifications/settings';

  constructor(public api: ApiService, public activatedRoute: ActivatedRoute, private messageService: MessageService, private router: Router) {}

  ngOnInit() {
    const initParam = this.activatedRoute.snapshot.queryParams[this.INIT_QUERY_PARAM];
    if (!initParam) {
      this.navigateToSettings(this.api.dataControlSE?.myInitiativesList[0]?.id);
    } else {
      this.getNotificationSettings(initParam);
    }
  }

  handleInitiativeSettingsChange() {
    const initiativeId = this.activatedRoute.snapshot.queryParams[this.INIT_QUERY_PARAM];
    this.settingsArray = this.settingsArray.map(setting => {
      if (setting.initiative_id == initiativeId) {
        setting.email_notifications_contributing_request_enabled = this.emailNotifications;
        setting.email_notifications_updates_enabled = this.systemNotifications;
      }
      return setting;
    });
  }

  getNotificationSettings(initiativeId: string) {
    this.isLoading = true;
    this.api.resultsSE.GET_userAllNotificationSettings().subscribe({
      next: ({ response }) => {
        this.populateSettingsArray(response);
        this.updateNotificationSettings(initiativeId);
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
    this.navigateToSettings(initiative.id);
    this.updateNotificationSettings(initiative.id);
  }

  onSaveSection() {
    if (this.isSaving || !this.activatedRoute.snapshot.queryParams[this.INIT_QUERY_PARAM]) return;
    this.isSaving = true;
    this.api.resultsSE.PATCH_userNotificationSettingsByInitiativeId(this.settingsArray).subscribe({
      next: () => this.handleSaveSuccess(),
      error: err => {
        console.error(err);
        this.isLoading = false;
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error updating settings' });
      }
    });
  }

  navigateToSettings(initiativeId: string) {
    this.router.navigate([this.SETTINGS_ROUTE], { queryParams: { init: initiativeId } });
  }

  private populateSettingsArray(response: any[]) {
    this.api.dataControlSE?.myInitiativesList.forEach(init => {
      if (!response.find(setting => setting.initiative_id == init.id)) {
        response.push({
          initiative_id: init.id,
          email_notifications_contributing_request_enabled: false,
          email_notifications_updates_enabled: false
        });
      }
    });
    this.settingsArray = response;
  }

  private updateNotificationSettings(initiativeId: string) {
    const settings = this.settingsArray.find(setting => setting.initiative_id == initiativeId);
    this.emailNotifications = settings?.email_notifications_contributing_request_enabled;
    this.systemNotifications = settings?.email_notifications_updates_enabled;
  }

  handleSaveSuccess() {
    this.isSaving = false;
    this.getNotificationSettings(this.activatedRoute.snapshot.queryParams[this.INIT_QUERY_PARAM]);
    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!' });
  }
}
