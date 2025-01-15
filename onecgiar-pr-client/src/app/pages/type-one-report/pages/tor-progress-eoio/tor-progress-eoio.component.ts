import { Component, OnInit } from '@angular/core';
import { OutcomeIndicatorService } from '../../../outcome-indicator/services/outcome-indicator.service';

@Component({
  selector: 'app-tor-progress-eoio',
  templateUrl: './tor-progress-eoio.component.html',
  styleUrls: ['./tor-progress-eoio.component.scss']
})
export class TorProgressEoioComponent implements OnInit {
  requesting: boolean = false;

  constructor(public outcomeIService: OutcomeIndicatorService) {}

  ngOnInit(): void {
    this.outcomeIService.getEOIsData(true);
  }

  exportExcel() {
    this.requesting = true;

    setTimeout(() => {
      this.requesting = false;
    }, 2000);
  }
}
