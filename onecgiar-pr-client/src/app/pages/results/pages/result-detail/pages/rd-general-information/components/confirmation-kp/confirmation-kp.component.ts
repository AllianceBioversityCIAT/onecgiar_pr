import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-confirmation-kp',
  templateUrl: './confirmation-kp.component.html',
  styleUrls: ['./confirmation-kp.component.scss']
})
export class ConfirmationKPComponent {
  @Input() body: any;
  @Input() mqapResult: any;
  @Input() selectedResultType: any;

  confirmationText: string;

  constructor(public api: ApiService) {}

  downloadPDF() {
    console.log('incoming body', this.body);
    this.api.resultsSE.GET_downloadPDF(this.mqapResult.result_code, this.mqapResult.version_id).subscribe({
      next: response => {
        console.log('Downloading pdf...');
        let fileName = 'ResultReport.pdf'; // Default name if not found
        response.headers.keys().forEach(key => {
          if (key.toLowerCase() === 'content-disposition') {
            const contentDisposition = response.headers.get(key);
            const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (match && match[1]) {
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
      },
      error: err => {
        console.error('your error handling here...', err);
      }
    });
  }
}
