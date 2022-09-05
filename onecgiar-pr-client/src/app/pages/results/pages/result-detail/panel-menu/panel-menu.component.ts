import { Component, OnInit } from '@angular/core';
import { menu } from './menu-data';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss']
})
export class PanelMenuComponent implements OnInit {
  menu = menu;
  constructor() { }

  ngOnInit(): void {
  }

}
