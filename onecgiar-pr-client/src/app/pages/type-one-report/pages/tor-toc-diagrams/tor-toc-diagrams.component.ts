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
    this.folderUrl = '';
    this.api.endpointsSE.resultFolders(this.typeOneReportSE.phaseDefaultId).subscribe({
      next: resp => {
        const firstFolderPath = resp?.response?.[0]?.folder_path;
        this.folderUrl = firstFolderPath || '';
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
