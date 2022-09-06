import { Component, OnInit } from '@angular/core';
import { PrRoute, resultDetailRouting } from '../../../../../shared/data/routing-data';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss']
})
export class PanelMenuComponent implements OnInit {
  navigationOptions: PrRoute[] = resultDetailRouting;

  constructor() {}

  ngOnInit(): void {}
}
