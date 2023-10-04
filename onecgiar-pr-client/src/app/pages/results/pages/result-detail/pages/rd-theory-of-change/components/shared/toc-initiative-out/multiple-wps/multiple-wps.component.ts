import { Component, OnInit } from '@angular/core';

interface Tab {
  id: number;
  content: string;
  validation: boolean;
}

@Component({
  selector: 'app-multiple-wps',
  templateUrl: './multiple-wps.component.html',
  styleUrls: ['./multiple-wps.component.scss']
})
export class MultipleWPsComponent implements OnInit {
  multipleWPsTabs: Tab[] = [
    {
      id: 1 * Math.random(),
      content: 'WP1 content',
      validation: true
    }
  ];

  activeTab: Tab = this.multipleWPsTabs[0];

  constructor() {}

  onAddTab() {
    const idRandomNumber = (this.multipleWPsTabs.length + 1) * Math.random();

    this.multipleWPsTabs.push({
      id: idRandomNumber,
      content: `WP${idRandomNumber.toFixed(2)} content`,
      validation: false
    });
  }

  onActiveTab(tab: Tab) {
    this.activeTab = tab;
  }

  onDeleteTab(tab: Tab) {
    if (this.multipleWPsTabs.length === 1) {
      return;
    }

    this.multipleWPsTabs = this.multipleWPsTabs.filter(t => t.id !== tab.id);

    this.activeTab = this.multipleWPsTabs[0];
  }

  ngOnInit(): void {}
}
