import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-toc-diagrams',
  templateUrl: './tor-toc-diagrams.component.html',
  styleUrls: ['./tor-toc-diagrams.component.scss']
})
export class TorTocDiagramsComponent implements OnInit {
  folderUrl: string = '';
  constructor(private api: ApiService, private typeOneReportSE: TypeOneReportService) {}

  ngOnInit(): void {
    this.getResultFolders();
  }

  getResultFolders() {
    console.log(this.typeOneReportSE.phaseSelected);
    this.folderUrl = '';
    this.api.endpointsSE.resultFolders(this.typeOneReportSE.phaseSelected).subscribe({
      next: resp => (this.folderUrl = resp?.response?.shift()?.folder_path),
      error: err => {
        console.log(err);
      }
    });
  }
}
