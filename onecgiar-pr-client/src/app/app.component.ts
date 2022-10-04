import { Component } from '@angular/core';
import { AuthService } from './shared/services/api/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'onecgiar-pr-client';
  constructor(public AuthService: AuthService) {}
}
