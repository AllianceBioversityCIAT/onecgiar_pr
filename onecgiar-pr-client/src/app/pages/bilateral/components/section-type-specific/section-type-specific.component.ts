import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { TypePolicyChangeComponent } from './type-policy-change/type-policy-change.component';
import { TypeInnovationUseComponent } from './type-innovation-use/type-innovation-use.component';
import { TypeCapacitySharingComponent } from './type-capacity-sharing/type-capacity-sharing.component';
import { TypeKnowledgeProductComponent } from './type-knowledge-product/type-knowledge-product.component';
import { TypeInnovationDevComponent } from './type-innovation-dev/type-innovation-dev.component';

const TYPE_LABELS: Record<number, string> = {
  1: 'Policy Change',
  2: 'Innovation Use',
  4: 'Other Outcome',
  5: 'Capacity Sharing for Development',
  6: 'Knowledge Product',
  7: 'Innovation Development',
  8: 'Other Output',
};

const NO_TYPE_SPECIFIC = new Set([4, 8, 9]);

@Component({
  selector: 'app-section-type-specific',
  imports: [
    CommonModule,
    TypePolicyChangeComponent,
    TypeInnovationUseComponent,
    TypeCapacitySharingComponent,
    TypeKnowledgeProductComponent,
    TypeInnovationDevComponent,
  ],
  templateUrl: './section-type-specific.component.html',
  styleUrl: './section-type-specific.component.scss',
})
export class SectionTypeSpecificComponent {
  private readonly creationService = inject(BilateralCreationService);

  resultTypeId = computed(() => this.creationService.resultTypeId());
  typeLabel = computed(() => TYPE_LABELS[this.resultTypeId() ?? 0] ?? 'Unknown');
  hasNoTypeSpecific = computed(() => NO_TYPE_SPECIFIC.has(this.resultTypeId() ?? 0));
}
