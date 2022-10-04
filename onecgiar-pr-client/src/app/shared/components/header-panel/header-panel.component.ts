import { Component } from '@angular/core';
import { internationalizationData } from '../../data/internationalizationData';
import { AuthService } from '../../services/api/auth.service';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent {
  internationalizationData = internationalizationData;
  constructor(public authService: AuthService) {}
}
