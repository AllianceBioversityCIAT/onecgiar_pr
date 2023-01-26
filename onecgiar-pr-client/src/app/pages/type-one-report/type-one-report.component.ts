import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent {
  sections = [
    { path: '1', icon: '', name: 'Fact sheet' },
    { path: '2', icon: '', name: 'Initiative progress & Key results' },
    { path: '3', icon: '', name: 'Impact pathway integration - External partners' },
    { path: '4', icon: '', name: 'Impact pathway integration - CGIAR portfolio linkages' },
    { path: '5', icon: '', name: 'Key result story' }
  ];
  constructor(private titleService: Title) {}
  ngOnInit(): void {
    this.titleService.setTitle('Type one report');
  }
}
