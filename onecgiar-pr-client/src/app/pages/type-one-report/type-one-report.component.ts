import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-type-one-report',
  templateUrl: './type-one-report.component.html',
  styleUrls: ['./type-one-report.component.scss']
})
export class TypeOneReportComponent {
  constructor(private titleService: Title) {}
  ngOnInit(): void {
    this.titleService.setTitle('Type one report');
  }
}
