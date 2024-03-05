import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tor-toc-diagrams',
  standalone: true,
  templateUrl: './tor-toc-diagrams.component.html',
  styleUrls: ['./tor-toc-diagrams.component.scss'],
  imports: [CommonModule, PrButtonComponent]
})
export class TorTocDiagramsComponent implements OnInit {
  folderUrl: string = '';
  constructor(
    private api: ApiService,
    private typeOneReportSE: TypeOneReportService
  ) {}

  ngOnInit(): void {
    this.getResultFolders();
  }

  getResultFolders() {
    this.folderUrl = '';
    this.api.endpointsSE
      .resultFolders(this.typeOneReportSE.phaseSelected)
      .subscribe({
        next: resp => {
          const firstFolderPath = resp?.response?.[0]?.folder_path;
          this.folderUrl = firstFolderPath || '';
        },
        error: err => {
          console.log(err);
        }
      });
  }
}
