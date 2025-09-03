import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RetrieveModalService } from '../../../../../../../results/pages/result-detail/components/retrieve-modal/retrieve-modal.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrListService } from '../../services/ipsr-list.service';

@Component({
  selector: 'app-innovation-package-custom-table',
  templateUrl: './innovation-package-custom-table.component.html',
  styleUrls: ['./innovation-package-custom-table.component.scss'],
  standalone: false
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
    { title: 'Phase Portfolio', attr: 'phase_name' },
    { title: 'Created by', attr: 'created_by' }
  ];

  constructor(
    public api: ApiService,
    public retrieveModalSE: RetrieveModalService,
    public ipsrListService: IpsrListService
  ) {}

  items: MenuItem[] = [
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

    const canUpdate = this.shouldShowUpdate(result);
    this.items[1].visible = canUpdate;
    this.itemsWithDelete[1].visible = canUpdate;
  }

  private shouldShowUpdate(result): boolean {
    const initiativeMap = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    const hasInitiatives = initiativeMap.length > 0;
    const isPastPhase = this.isPastReportingPhase(result);

    if (this.api.rolesSE.isAdmin) {
      return hasInitiatives && isPastPhase;
    }

    return this.isUserIncludedInAnyInitiative(result) && isPastPhase;
  }

  private isPastReportingPhase(result): boolean {
    const phaseYear = this.api.dataControlSE.reportingCurrentPhase?.phaseYear;
    return typeof result?.phase_year === 'number' && typeof phaseYear === 'number' && result.phase_year < phaseYear;
  }

  private isUserIncludedInAnyInitiative(result): boolean {
    const mapIds = this.getInitiativeIdsFromMap(result);
    const userInitiativeIds = this.getUserInitiativeIds(result);
    return mapIds.some(entityId => userInitiativeIds.includes(entityId));
  }

  private getInitiativeIdsFromMap(result): Array<string | number> {
    const mapArray = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    return mapArray.map((item: any) => item?.entityId).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }

  private getUserInitiativeIds(result): Array<string | number> {
    const userArray = Array.isArray(result?.initiative_entity_user) ? result.initiative_entity_user : [];
    return userArray.map((item: any) => item?.initiative_id).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }
}
