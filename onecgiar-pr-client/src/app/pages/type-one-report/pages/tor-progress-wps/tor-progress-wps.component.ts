import { Component, OnInit } from '@angular/core';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';

@Component({
  selector: 'app-tor-progress-wps',
  templateUrl: './tor-progress-wps.component.html',
  styleUrls: ['./tor-progress-wps.component.scss']
})
export class TorProgressWpsComponent implements OnInit {
  requesting: boolean = false;

  constructor(public outcomeIService: OutcomeIndicatorService) {}

  ngOnInit(): void {
    this.outcomeIService.getWorkPackagesData(true);
  }

  exportExcel() {
    this.requesting = true;

    setTimeout(() => {
      this.requesting = false;
    }, 2000);
  }
}
