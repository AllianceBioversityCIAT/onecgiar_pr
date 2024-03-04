import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ChangeResultTypeServiceService } from '../../services/change-result-type-service.service';
import { CommonModule } from '@angular/common';
import { PdfIconComponent } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.component';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrInputComponent } from '../../../../../../../../custom-fields/pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-confirmation-kp',
  standalone: true,
  templateUrl: './confirmation-kp.component.html',
  styleUrls: ['./confirmation-kp.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PdfIconComponent,
    PrSelectComponent,
    PrInputComponent
  ]
})
export class ConfirmationKPComponent {
  @Input() body: any;
  @Input() mqapResult: any;
  @Input() selectedResultType: any;

  isDownloading = false;

  selectOptions = [
    { value: 'Quality Assurance Feedback' },
    { value: 'Change to more appropriate result type based on guidelines' },
    { value: 'Error Correction' },
    { value: 'Other' }
  ];

  constructor(
    public api: ApiService,
    public changeType: ChangeResultTypeServiceService
  ) {}

  downloadPDF() {
    this.isDownloading = true;

    this.api.resultsSE
      .GET_downloadPDF(this.body.result_code, this.body.version_id)
      .subscribe({
        next: response => {
          let fileName = 'ResultReport.pdf';
          response.headers.keys().forEach(key => {
            if (key.toLowerCase() === 'content-disposition') {
              const contentDisposition = response.headers.get(key);
              const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
                contentDisposition
              );
              if (match[1]) {
                fileName = match[1].replace(/['"]/g, '');
              }
            }
          });

          const pdfBlobUrl = URL.createObjectURL(response.body);

          const a = document.createElement('a');
          a.href = pdfBlobUrl;
          a.download = fileName;
          a.style.display = 'none';

          document.body.appendChild(a);

          a.click();

          document.body.removeChild(a);

          URL.revokeObjectURL(pdfBlobUrl);
          this.isDownloading = false;
        },
        error: err => {
          console.error('your error handling here...', err);
          this.isDownloading = false;
        }
      });
  }
}
