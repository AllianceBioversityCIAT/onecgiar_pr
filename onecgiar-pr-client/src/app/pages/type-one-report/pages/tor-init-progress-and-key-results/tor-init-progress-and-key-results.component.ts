import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tor-init-progress-and-key-results',
  templateUrl: './tor-init-progress-and-key-results.component.html',
  styleUrls: ['./tor-init-progress-and-key-results.component.scss']
})
export class TorInitProgressAndKeyResultsComponent {
  header = [
    { attr: 'wp', name: 'Work Package', type: 'normal' },
    { attr: 'wpTocUrl', name: 'Work package TOC image', type: 'url' }
  ];

  data = [
    { wp: 'Work Package 1', wpTocUrl: 'https://cgiar.sharepoint.com/:i:/s/PRMSProject/EW-TRb51xN9Hu6sHk1ZFZq4BkpxnB9cGu4Z866N5lY--CA?e=8cBZ0f' },
    { wp: 'Work Package 2', wpTocUrl: 'https://cgiar.sharepoint.com/:i:/s/PRMSProject/EW-TRb51srw4543sdfsdfsd33443a-765-cuuGTRE0L' },
    { wp: 'Work Package 3', wpTocUrl: 'https://cgiar.sharepoint.com/:i:/s/PRMSProject/EW-TRb51xN9Hu6sHk1ZFZq4BkpxnB9c4t3etkijsfw' },
    { wp: 'Work Package 4', wpTocUrl: 'https://cgiar.sharepoint.com/:i:/s/PRMSProject/EW-TRbnbhcasd78UDRE0891ZFZq4BkpxnB9c87ysdfUHkw' }
  ];
  constructor() {}
}
