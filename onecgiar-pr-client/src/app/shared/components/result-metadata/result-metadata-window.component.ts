import { Component, HostListener, inject } from '@angular/core';
import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';
import { ResultMetadataListComponent } from './result-metadata-list.component';
import { ResultMetadataPanelService } from './result-metadata-panel.service';

/**
 * RESULT METADATA as a free-floating, draggable card.
 *
 * The dragging is NOT hand-rolled: `@angular/cdk/drag-drop` (already a dependency) supplies the
 * pointer maths, the pointer capture and the transform, which is the same job the AI assistant's
 * window does with ~90 lines of private methods coupled to `AiAssistantService`. What IS borrowed
 * from that component is the part CDK does not give you: clamping the card against the viewport on
 * drop, on resize and on READ, plus the try/catch'd localStorage geometry — see
 * `AiAssistantPanelComponent.onViewportResize()` / `initialRect()`.
 *
 * Position and open state live in {@link ResultMetadataPanelService} (root-scoped), never here, so
 * they outlive the re-creation of the result-detail view on every result switch.
 *
 * Change detection is DEFAULT so the projected metadata list — which reads plain, non-signal
 * service fields — keeps repainting when the open result changes.
 */
@Component({
  selector: 'app-result-metadata-window',
  standalone: true,
  imports: [CdkDrag, CdkDragHandle, ResultMetadataListComponent],
  templateUrl: './result-metadata-window.component.html'
})
export class ResultMetadataWindowComponent {
  readonly panelSE = inject(ResultMetadataPanelService);

  /** CDK reports the free-drag delta; the service clamps it and writes it through to storage. */
  onDragEnded(event: CdkDragEnd): void {
    this.panelSE.setPosition(event.source.getFreeDragPosition());
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    // Re-running the stored position through the clamp is what rescues a card parked on the right
    // edge of a wide monitor after the window is narrowed.
    const current = this.panelSE.position();
    const clamped = this.panelSE.clampToViewport(current);
    // Dragging a browser window emits dozens of resize events per second, and `setPosition` writes
    // to localStorage on every call — for a card that is usually nowhere near an edge (and often
    // not even open, since this host stays alive while docked). Only pay that cost when the clamp
    // actually has to move the card. `setPosition` still hands CDK a fresh object when it does, so
    // the drop-snap-back path is untouched.
    if (clamped.x === current.x && clamped.y === current.y) return;
    this.panelSE.setPosition(clamped);
  }
}
