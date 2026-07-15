import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from './ai-assistant.service';
import { MODEL_TIERS } from './engine/model-tiers';

/**
 * Floating assistant: a launcher FAB (bottom-right) plus a right-docked,
 * non-modal slide-in panel. Renders four states from the orchestrator's signals:
 * unsupported / opt-in / downloading / chat. Tailwind-only, brand tokens.
 */
@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-assistant-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantPanelComponent {
  readonly assistant = inject(AiAssistantService);
  readonly draft = signal('');

  readonly downloadMB = computed(() => {
    const tier = this.assistant.tier();
    return tier === 'unsupported' ? 0 : MODEL_TIERS[tier].downloadMB;
  });

  readonly progressPct = computed(() => Math.round((this.assistant.progress()?.progress ?? 0) * 100));

  toggle(): void {
    this.assistant.toggle();
  }

  startDownload(): void {
    void this.assistant.startModel();
  }

  submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    void this.assistant.send(text);
  }

  retry(): void {
    void this.assistant.startModel();
  }

  open(url: string): void {
    this.assistant.openUrl(url);
  }
}
