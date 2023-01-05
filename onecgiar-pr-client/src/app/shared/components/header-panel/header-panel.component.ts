import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../data/internationalizationData';
import { AuthService } from '../../services/api/auth.service';
import { ApiService } from '../../services/api/api.service';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent implements OnInit {
  internationalizationData = internationalizationData;
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }
}
