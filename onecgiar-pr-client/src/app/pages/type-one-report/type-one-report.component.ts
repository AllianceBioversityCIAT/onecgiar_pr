import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent {
  sections = [
    { path: 'fact-sheet', icon: '', name: 'Fact sheet' },
    { path: 'initiative-progress-and-key-results', icon: '', name: 'Initiative progress & Key results' },
    { path: 'ipi-external-partners', icon: '', name: 'Impact pathway integration - External partners' },
    { path: 'ipi-cgiar-portfolio-linkages', icon: '', name: 'Impact pathway integration - CGIAR portfolio linkages' },
    { path: 'key-result-story', icon: '', name: 'Key result story' }
  ];
  constructor(private titleService: Title) {}
  ngOnInit(): void {
    this.titleService.setTitle('Type one report');
  }
}
