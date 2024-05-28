import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

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
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'official_code' },
    { title: 'Status', attr: 'status' },
    { title: 'Phase year', attr: 'phase_year' },
    { title: 'Phase name', attr: 'phase_name' },
    { title: 'Created by', attr: 'created_by' }
  ];

  constructor(public api: ApiService, public retrieveModalSE: RetrieveModalService) {}

  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    }
  ];

  itemsWithDelete: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-fw pi-clone',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.onDelete();
      }
    }
  ];

  onDelete() {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to delete the Innovation Package "${this.currentInnovationPackageToAction.title}"?`,
        description: `If you delete this Innovation Package it will no longer be displayed in the list of Innovation Packages.`,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.api.resultsSE.DELETEInnovationPackage(this.currentInnovationPackageToAction.id).subscribe({
          next: resp => {
            this.api.alertsFe.show({
              id: 'confirm-delete-result-su',
              title: `The Innovation Package "${this.currentInnovationPackageToAction.title}" was deleted`,
              description: ``,
              status: 'success'
            });
            this.deleteEvent.emit();
          },
          error: err => {
            this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete Innovation Package', description: '', status: 'error' });
          }
        });
      }
    );
  }
  onPressAction(result) {
    const onlyNumbers = result?.official_code.replace(/\D+/g, '');
    this.currentInnovationPackageToAction.id = result?.id;
    this.currentInnovationPackageToAction.title = result.title;
    this.retrieveModalSE.title = result?.title;
    this.retrieveModalSE.requester_initiative_id = onlyNumbers;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;

    this.itemsWithDelete[1].visible =
      this.api.dataControlSE.currentResult?.phase_year < this.api.dataControlSE.IPSRCurrentPhase?.phaseYear &&
      this.api.dataControlSE.currentResult?.phase_year !== this.api.dataControlSE.IPSRCurrentPhase?.phaseYear;
  }
}
