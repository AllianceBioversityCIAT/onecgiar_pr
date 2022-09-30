import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { internationalizationData } from '../../data/internationalizationData';

@Component({
  selector: 'app-header-panel',
  templateUrl: './header-panel.component.html',
  styleUrls: ['./header-panel.component.scss']
})
export class HeaderPanelComponent {
  internationalizationData = internationalizationData;
  constructor(public authService: AuthService) {}
}
