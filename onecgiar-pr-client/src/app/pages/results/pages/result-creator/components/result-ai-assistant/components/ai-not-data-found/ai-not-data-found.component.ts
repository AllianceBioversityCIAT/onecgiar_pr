import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { CreateResultManagementService } from '../../../../services/create-result-management.service';

@Component({
  selector: 'app-ai-not-data-found',
  imports: [CommonModule, CustomFieldsModule],
  templateUrl: './ai-not-data-found.component.html',
  styleUrl: './ai-not-data-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiNotDataFoundComponent {
  createResultManagementService = inject(CreateResultManagementService);
}
