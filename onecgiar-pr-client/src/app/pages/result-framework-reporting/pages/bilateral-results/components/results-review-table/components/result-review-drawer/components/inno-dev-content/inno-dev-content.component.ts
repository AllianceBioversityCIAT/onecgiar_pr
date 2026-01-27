import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { InnovationControlListService } from '../../../../../../../../../../shared/services/global/innovation-control-list.service';

@Component({
  selector: 'app-inno-dev-content',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './inno-dev-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss'
})
export class InnoDevContentComponent {
  @Input() resultDetail: BilateralResultDetail;

  innovationControlListSE = inject(InnovationControlListService);

  readinessDescription(): string {
    return 'Use the slider to select the appropriate readiness level. Readiness levels range from 1 (basic research) to 9 (proven in operational environment).';
  }
}
