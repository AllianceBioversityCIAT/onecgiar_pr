import { Component, Input, ChangeDetectorRef, OnInit, OnDestroy, inject, effect, EffectRef, Injector, runInInjectionContext } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { Resulttype } from '../../../../../../shared/interfaces/result.interface';

@Component({
  selector: 'app-result-level-cards',
  templateUrl: './result-level-cards.component.html',
  styleUrls: ['./result-level-cards.component.scss'],
  standalone: false
})
export class ResultLevelCardsComponent implements OnInit, OnDestroy {
  @Input() currentResultType: Resulttype | string | null = null;
  @Input() hideAlert: boolean = false;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly injector = inject(Injector);
  private effectRef: EffectRef | undefined;

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService
  ) {}

  ngOnInit() {
    // Create an effect to detect signal changes and force change detection
    this.effectRef = runInInjectionContext(this.injector, () => {
      return effect(() => {
        // Read the signal to create dependency - this will make the effect run when it changes
        this.resultLevelSE.outputOutcomeLevelsSig();
        // Force change detection after the signal changes
        this.cdr.markForCheck();
      });
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }
}
