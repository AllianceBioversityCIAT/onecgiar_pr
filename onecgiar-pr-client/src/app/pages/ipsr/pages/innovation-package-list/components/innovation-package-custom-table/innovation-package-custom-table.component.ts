import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-innovation-package-custom-table',
  templateUrl: './innovation-package-custom-table.component.html',
  styleUrls: ['./innovation-package-custom-table.component.scss']
})
export class InnovationPackageCustomTableComponent {
  @Input() tableData: any;
  @Input() total: number = 0;
  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Status', attr: 'status' },
    { title: 'Year', attr: 'reported_year_id' }
  ];
  constructor(public api: ApiService) {}
  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        // console.log('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        // console.log(this.api.resultsSE.currentResultId);
        // event
      }
    }
    // { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    // { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];

  itemsWithDelete: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        // console.log('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        // console.log(this.api.resultsSE.currentResultId);
        // event
      }
    },
    // { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    {
      label: 'Delete',
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.onDelete();
      }
    }
    // { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];
  onDelete() {
    // console.log(this.api.dataControlSE.currentResult);
    this.api.alertsFe.show({ id: 'confirm-delete-result', title: `Are you sure you want to delete the result "${this.api.dataControlSE?.currentResult?.title}"?`, description: `If you delete this result it will no longer be displayed in the list of results.`, status: 'success', confirmText: 'Yes, delete' }, () => {
      // console.log('delete');
      this.api.resultsSE.PATCH_DeleteResult(this.api.dataControlSE.currentResult.id).subscribe(
        resp => {
          // console.log(resp);
          this.api.alertsFe.show({ id: 'confirm-delete-result-su', title: `The result "${this.api.dataControlSE?.currentResult?.title}" was deleted`, description: ``, status: 'success' });
          this.api.updateResultsList();
        },
        err => {
          console.log(err);
          this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
        }
      );
    });
  }
  onPressAction(result) {
    // console.log(result);
    // this.retrieveModalSE.title = result?.title;
    // this.api.resultsSE.currentResultId = result?.id;
    // this.api.dataControlSE.currentResult = result;
  }
}
