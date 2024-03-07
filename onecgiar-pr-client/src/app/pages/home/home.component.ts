import { Component, OnInit } from '@angular/core';
import { internationalizationData } from '../../shared/data/internationalizationData';
import { ApiService } from '../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { ActionAreaCounterComponent } from './components/action-area-counter/action-area-counter.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, ActionAreaCounterComponent]
})
export class HomeComponent implements OnInit {
  internationalizationData = internationalizationData;
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.api.updateUserData(() => {});
  }
}
