import { Component, OnInit, ViewChild } from '@angular/core';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../shared/enum/api.enum';
import { Phase } from '../../../../shared/interfaces/phase.interface';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-phase-management',
  templateUrl: './phase-management.component.html',
  styleUrls: ['./phase-management.component.scss']
})
export class PhaseManagementComponent implements OnInit {
  show_full_screen = false;
  phaseList: any[] = [];
  clonedphaseList: { [s: string]: any } = {};
  textToFind = '';
  newPhase: any[] = [];
  @ViewChild('dt') table: Table;
  status = [
    {
      status: true,
      name: 'Open'
    },
    {
      status: false,
      name: 'Closed'
    }
  ];
  constructor(public resultsSE: ResultsApiService) {}

  ngOnInit(): void {
    this.getAllPhases();
  }

  getAllPhases() {
    this.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING).subscribe({
      next: ({ response }) => {
        console.log(response);
        this.phaseList = response;
      }
    });
  }

  onRowEditInit(phase: any) {
    this.clonedphaseList[phase.id as string] = { ...phase };
  }

  onRowEditSave(phase: any) {
    console.log(phase);
    this.resultsSE.PATCH_updatePhase(phase.id, phase).subscribe({
      next: ({ response }) => {
        this.getAllPhases();
      }
    });
    delete this.clonedphaseList[phase.id as string];
  }

  onlyPreviousPhase(currentPhase: any) {
    return this.phaseList.filter(el => el.phase_year >= currentPhase.phase_year);
  }

  onRowEditCancel(phase: any, index: number) {
    if (!!phase?.is_new) {
      const temp = this.phaseList.filter((el, ind) => ind != index);
      this.phaseList = temp;
    }
    this.phaseList[index].status = this.clonedphaseList[phase.id as string].status;
    this.phaseList[index].phase_name = this.clonedphaseList[phase.id as string].phase_name;
    delete this.clonedphaseList[phase.id as string];
  }

  addNewPhase() {
    const tempNewPhase: any = new Phase();
    tempNewPhase.is_new = true;
    this.phaseList = [...this.phaseList, tempNewPhase];
    this.newPhase.forEach((el, index) => {
      this.table.initRowEdit(this.phaseList[this.phaseList.length - (this.newPhase.length - index)]);
    });
  }

  activeRow(data) {
    data = false;
  }
}
