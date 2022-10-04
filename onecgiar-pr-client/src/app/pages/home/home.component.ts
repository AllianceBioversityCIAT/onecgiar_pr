import { Component } from '@angular/core';
import { internationalizationData } from 'src/app/shared/data/internationalizationData';
import { AuthService } from '../../shared/services/api/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  internationalizationData = internationalizationData;
  constructor(public authService: AuthService) {}
}
