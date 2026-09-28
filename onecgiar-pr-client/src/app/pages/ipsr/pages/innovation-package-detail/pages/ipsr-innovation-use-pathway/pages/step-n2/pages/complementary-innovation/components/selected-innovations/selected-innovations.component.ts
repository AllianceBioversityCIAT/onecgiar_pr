import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideFileText, lucidePencil, lucideSparkles, lucideX } from '@ng-icons/lucide';
import { CustomFieldsModule } from '../../../../../../../../../../../../custom-fields/custom-fields.module';
import { COMPLEMENTARY_INNOVATION_COPY } from '../complementary-innovation.copy';

/** Result type of the ad-hoc entries created from the Step 2.1 modal (`NewComplementaryInnovationComponent`). */
const CREATED_IN_IPSR_TYPE_ID = 11;
/** Innovation Development — opened read-only (eye), as before P2-3840. */
const INNOVATION_DEVELOPMENT_TYPE_ID = 7;

/**
 * P2-3840 — the list of complementary innovations/ enablers/ solutions already in the bundle.
 * Presentation only: the parent keeps the list and decides what "open" and "remove" do
 * (`getComplementaryInnovation()` / `cancelInnovation()`), exactly as when these rows lived in its template.
 * Same card language as the Step 3 evidence list (seal · content · actions, resting actions at 45 %).
 */
@Component({
  selector: 'app-selected-innovations',
  standalone: true,
  imports: [CommonModule, CustomFieldsModule, NgIcon],
  providers: [provideIcons({ lucideEye, lucideFileText, lucidePencil, lucideSparkles, lucideX })],
  templateUrl: './selected-innovations.component.html',
  styleUrls: ['./selected-innovations.component.scss']
})
export class SelectedInnovationsComponent {
  @Input() items: any[] = [];
  @Input() readOnly = false;
  /** Pencil / eye — the parent opens the modal (created in IPSR) or the result in a new tab. */
  @Output() openEvent = new EventEmitter<any>();
  @Output() removeEvent = new EventEmitter<any>();

  readonly copy = COMPLEMENTARY_INNOVATION_COPY;

  isCreatedInIpsr(result: any): boolean {
    return result?.result_type_id == CREATED_IN_IPSR_TYPE_ID;
  }

  /** Same rule the old `<i>` used: read-only users and Innovation Developments only view. */
  isViewOnly(result: any): boolean {
    return this.readOnly || result?.result_type_id === INNOVATION_DEVELOPMENT_TYPE_ID;
  }
}
