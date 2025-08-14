import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../shared/data/internationalization-data';
import { ApiService } from '../../shared/services/api/api.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false
})
export class HomeComponent implements OnInit {
  internationalizationData = internationalizationData;
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }
}
