import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-steper-navigation',
  templateUrl: './steper-navigation.component.html',
  styleUrls: ['./steper-navigation.component.scss']
})
export class SteperNavigationComponent {
  @Input() options: any;
}
