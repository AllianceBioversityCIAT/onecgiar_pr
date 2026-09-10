import {
  Component,
  Output,
  EventEmitter,
  Input,
  ElementRef,
  inject,
  OnDestroy,
  effect,
  signal,
  HostBinding
} from '@angular/core';
import { DataControlService } from '../../shared/services/data-control.service';
import { RolesService } from '../../shared/services/global/roles.service';
import { SectionBottomBarSlotService } from '../../pages/results/pages/result-detail/components/section-bottom-bar/section-bottom-bar-slot.service';

@Component({
  selector: 'app-sync-button',
  templateUrl: './sync-button.component.html',
  styleUrls: ['./sync-button.component.scss'],
  standalone: false
})
export class SyncButtonComponent implements OnDestroy {
  @Input() text: string = 'Sync';
  @Output() clickSave = new EventEmitter();

  private readonly slotSE = inject(SectionBottomBarSlotService, { optional: true });
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly inBottomBar = signal(false);

  @HostBinding('class.in-bottom-bar') get hostInBottomBar() {
    return this.inBottomBar();
  }

  constructor(public dataControlSE: DataControlService, public rolesSE: RolesService) {
    effect(() => {
      const slot = this.slotSE?.syncSlot();
      if (slot) {
        slot.appendChild(this.hostRef.nativeElement);
        this.inBottomBar.set(true);
      } else {
        this.inBottomBar.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.hostRef.nativeElement.remove();
  }

  onClickSave() {
    this.clickSave.emit();
  }
}
