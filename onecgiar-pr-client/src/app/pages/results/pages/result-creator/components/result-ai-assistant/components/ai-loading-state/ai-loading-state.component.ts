import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AiLoadingStateService } from './services/ai-loading-state.service';

@Component({
  selector: 'app-ai-loading-state',
  imports: [],
  templateUrl: './ai-loading-state.component.html',
  styleUrl: './ai-loading-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiLoadingStateComponent {
  aiLoadingStateService = inject(AiLoadingStateService);
}
