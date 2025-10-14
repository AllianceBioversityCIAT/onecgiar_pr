import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-aow-hlo-create-modal',
  imports: [DialogModule, CustomFieldsModule, MultiSelectModule, FormsModule],
  templateUrl: './aow-hlo-create-modal.component.html',
  styleUrl: './aow-hlo-create-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AowHloCreateModalComponent {
  api = inject(ApiService);
  entityAowService = inject(EntityAowService);

  allInitiatives = signal<any[]>([]);

  ngOnInit() {
    this.entityAowService.getW3BilateralProjects();
    this.api.resultsSE.GET_AllInitiatives('p25').subscribe(({ response }) => {
      this.allInitiatives.set(response);
      console.log(this.allInitiatives());
    });
  }

  removeBilateralProject(project: any) {
    this.entityAowService.selectedW3BilateralProjects.set(
      this.entityAowService.selectedW3BilateralProjects().filter(item => item.project_id !== project.project_id)
    );
  }

  removeEntityOption(option: any) {
    this.entityAowService.selectedEntities.set(this.entityAowService.selectedEntities().filter(item => item.id !== option.id));
  }

  GET_mqapValidation = () => {
    console.log('GET_mqapValidation');
  };
}
