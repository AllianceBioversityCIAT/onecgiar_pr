import { Component, OnInit } from '@angular/core';
import { AuthService } from './shared/services/api/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'onecgiar-pr-client';
  isProduction = environment.production;
  constructor(public AuthService: AuthService) {}
  ngOnInit(): void {
    this.AuthService.inLogin = false;
  }
}
