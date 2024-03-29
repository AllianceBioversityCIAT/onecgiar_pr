import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { MenuItem } from 'primeng/api';
import { RetrieveModalService } from '../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';

@Component({
  selector: 'app-innovation-package-custom-table',
  templateUrl: './innovation-package-custom-table.component.html',
  styleUrls: ['./innovation-package-custom-table.component.scss']
})
export class InnovationPackageCustomTableComponent {
  @Input() tableData: any;
  @Input() total: number = 0;
  @Output() deleteEvent = new EventEmitter();
  currentInnovationPackageToAction = { id: '', title: '' };
  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Status', attr: 'status' },
    { title: 'Year', attr: 'reported_year_id' }
  ];
  constructor(public api: ApiService, private retrieveModalSE: RetrieveModalService) {}
  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        //('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        //(this.api.resultsSE.currentResultId);
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
        //('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        //(this.api.resultsSE.currentResultId);
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
    //(this.api.dataControlSE.currentResult);
    this.api.alertsFe.show({ id: 'confirm-delete-result', title: `Are you sure you want to delete the Innovation Package "${this.currentInnovationPackageToAction.title}"?`, description: `If you delete this Innovation Package it will no longer be displayed in the list of Innovation Packages.`, status: 'success', confirmText: 'Yes, delete' }, () => {
      //('delete');
      this.api.resultsSE.DELETEInnovationPackage(this.currentInnovationPackageToAction.id).subscribe(
        resp => {
          //(resp);
          this.api.alertsFe.show({ id: 'confirm-delete-result-su', title: `The Innovation Package "${this.currentInnovationPackageToAction.title}" was deleted`, description: ``, status: 'success' });
          this.deleteEvent.emit();
        },
        err => {
          console.error(err);
          this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete Innovation Package', description: '', status: 'error' });
        }
      );
    });
  }
  onPressAction(result) {
    //(result);
    this.currentInnovationPackageToAction.id = result?.id;
    this.currentInnovationPackageToAction.title = result.title;
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
  }
}
