import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RetrieveModalService } from 'src/app/pages/results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-innovation-package-custom-table',
  templateUrl: './innovation-package-custom-table.component.html',
  styleUrls: ['./innovation-package-custom-table.component.scss']
})
export class InnovationPackageCustomTableComponent  {

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
    this.api.alertsFe.show({ id: 'confirm-delete-result', title: `Are you sure you want to delete the Innovation Package "${this.currentInnovationPackageToAction.title}"?`, description: `If you delete this Innovation Package it will no longer be displayed in the list of Innovation Packages.`, status: 'success', confirmText: 'Yes, delete' }, () => {
      // console.log('delete');
      this.api.resultsSE.DELETEInnovationPackage(this.currentInnovationPackageToAction.id).subscribe(
        resp => {
          console.log(resp);
          this.api.alertsFe.show({ id: 'confirm-delete-result-su', title: `The Innovation Package "${this.currentInnovationPackageToAction.title}" was deleted`, description: ``, status: 'success' });
          this.deleteEvent.emit();
        },
        err => {
          console.log(err);
          this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete Innovation Package', description: '', status: 'error' });
        }
      );
    });
  }
  onPressAction(result) {
    console.log(result);
    const onlyNumbers = result?.official_code.replace(/[^0-9]+/g, "");
    this.currentInnovationPackageToAction.id = result?.id;
    this.currentInnovationPackageToAction.title = result.title;
    this.retrieveModalSE.title = result?.title;
    this.retrieveModalSE.requester_initiative_id = onlyNumbers;
     this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
  }

}
