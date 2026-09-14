// @akili-spec bilateral/manual-create-drawer — drawer + optional SP gate + form
import { ChangeDetectionStrategy, Component, ElementRef, inject, input, viewChild } from '@angular/core';
import { BilateralAiUploadComponent } from '../bilateral-ai-upload/bilateral-ai-upload.component';
import { BilateralCreateDrawerComponent } from '../bilateral-create-drawer/bilateral-create-drawer.component';
import { BilateralManualCreateFormComponent } from '../bilateral-manual-create-form/bilateral-manual-create-form.component';
import { BilateralReportingWaySelectorComponent } from '../bilateral-reporting-way-selector/bilateral-reporting-way-selector.component';
import { BilateralSpSelectorComponent } from '../bilateral-sp-selector/bilateral-sp-selector.component';
import { BilateralManualCreateFlowService } from '../../services/bilateral-manual-create-flow.service';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../../internationalization/bilateral-manual-create.copy';

@Component({
  selector: 'app-bilateral-manual-create-drawer-host',
  imports: [
    BilateralCreateDrawerComponent,
    BilateralManualCreateFormComponent,
    BilateralSpSelectorComponent,
    BilateralReportingWaySelectorComponent,
    BilateralAiUploadComponent
  ],
  templateUrl: './bilateral-manual-create-drawer-host.component.html',
  styleUrl: './bilateral-manual-create-drawer-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralManualCreateDrawerHostComponent {
  readonly copy = BILATERAL_MANUAL_CREATE_COPY;
  readonly flow = inject(BilateralManualCreateFlowService);

  /** Element that receives focus when the drawer closes. */
  readonly restoreFocusTarget = input<ElementRef<HTMLElement> | null>(null);

  private readonly spSectionRef = viewChild<ElementRef<HTMLElement>>('spSection');

  onDrawerClosed(): void {
    this.flow.closeDrawer();
  }

  scrollToSpSection(): void {
    setTimeout(() => {
      this.spSectionRef()?.nativeElement?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}
