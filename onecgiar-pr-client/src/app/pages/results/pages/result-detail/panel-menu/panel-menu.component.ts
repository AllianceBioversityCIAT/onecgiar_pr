import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-panel-menu',
  templateUrl: './panel-menu.component.html',
  styleUrls: ['./panel-menu.component.scss']
})
export class PanelMenuComponent implements OnInit {
  menu=[
    {
      segmentName:'General info',
      sections:[
        {
          name:'Section A'
        },
        {
          name:'Section B'
        },
        {
          name:'Section C'
        }
      ]
    },
    {
      segmentName:'Example',
      sections:[
        {
          name:'Section A'
        },
        {
          name:'Section B'
        },
        {
          name:'Section C'
        }
      ]
    }
  ]
  constructor() { }

  ngOnInit(): void {
  }

}
