import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';

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
  constructor(private titleService: Title, public api: ApiService) {}
  ngOnInit(): void {
    this.titleService.setTitle('Type one report');
    this.GET_AllInitiatives();
  }
  onRemoveinit(option) {}

  allInitiatives = [];
  GET_AllInitiatives() {
    // console.log(this.api.rolesSE.isAdmin);
    if (!this.api.rolesSE.isAdmin) return;
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiatives = response;
    });
  }
}
