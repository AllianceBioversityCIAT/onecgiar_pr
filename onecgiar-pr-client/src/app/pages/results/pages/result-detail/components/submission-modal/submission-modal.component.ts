import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { SubmissionModalService } from './submission-modal.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from 'src/app/custom-fields/pr-button/pr-button.component';
import { PrTextareaComponent } from '../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-submission-modal',
  standalone: true,
  templateUrl: './submission-modal.component.html',
  styleUrls: ['./submission-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    PrButtonComponent,
    PrTextareaComponent
  ]
})
export class SubmissionModalComponent {
  comment = null;
  requesting = false;

  constructor(
    public api: ApiService,
    public dataControlSE: DataControlService,
    public submissionModalSE: SubmissionModalService,
    private currentResultSE: CurrentResultService
  ) {}

  cleanObject() {
    this.comment = null;
  }

  onSubmit() {
    this.requesting = true;
    this.api.resultsSE.PATCH_submit(this.comment).subscribe({
      next: resp => {
        this.api.alertsFe.show({
          id: 'submodal',
          title: `Success`,
          description: `The result has been submitted.`,
          status: 'success'
        });
        this.submissionModalSE.showModal = false;
        this.currentResultSE.GET_resultById();
        this.requesting = false;
      },
      error: err => {
        this.requesting = false;
        this.api.alertsFe.show({
          id: 'submodalerror',
          title: 'Error in submitting',
          description: err?.error?.message,
          status: 'error'
        });
      }
    });
  }
}
