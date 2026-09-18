// @akili-spec bilateral/manual-create-drawer (BIL-MCD-T-2)
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  OnDestroy,
  output,
  signal
} from '@angular/core';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../../internationalization/bilateral-manual-create.copy';

const DEFAULT_WIDTH = 760;
const MIN_WIDTH = 520;
const MOBILE_BREAKPOINT = 640;

function initialWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const vw = window.innerWidth;
  if (vw < MOBILE_BREAKPOINT) return vw;
  return Math.min(DEFAULT_WIDTH, vw);
}

function clampWidth(next: number): number {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
  if (vw < MOBILE_BREAKPOINT) return vw;
  return Math.min(Math.max(next, MIN_WIDTH), Math.min(900, vw));
}

@Component({
  selector: 'app-bilateral-create-drawer',
  imports: [],
  templateUrl: './bilateral-create-drawer.component.html',
  styleUrl: './bilateral-create-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralCreateDrawerComponent implements OnDestroy {
  readonly copy = BILATERAL_MANUAL_CREATE_COPY;

  readonly projectCode = input('');
  readonly projectTitle = input('');
  /** Bilateral Mapping Tool summary or description shown under the project title. */
  readonly projectSubtitle = input('');
  readonly programCode = input('');
  readonly programName = input('');
  /** Element to restore focus to when the drawer closes (BIL-MCD-R-8). */
  readonly restoreFocusTarget = input<ElementRef<HTMLElement> | null>(null);

  readonly closed = output<void>();
  readonly widthChange = output<number>();

  readonly width = signal(initialWidth());
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);

  private dragging = false;
  private previousBodyOverflow = '';

  constructor() {
    if (typeof document !== 'undefined') {
      this.previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.previousBodyOverflow;
    }
  }

  requestClose(): void {
    this.close();
  }

  close(): void {
    const target = this.restoreFocusTarget()?.nativeElement;
    this.closed.emit();
    if (target?.focus) {
      setTimeout(() => target.focus(), 0);
    }
  }

  onEscape(): void {
    this.requestClose();
  }

  startResize(event: MouseEvent): void {
    if (this.isMobile()) return;
    event.preventDefault();
    this.dragging = true;

    const move = (e: MouseEvent) => {
      if (!this.dragging) return;
      const next = clampWidth(window.innerWidth - e.clientX);
      this.width.set(next);
      this.widthChange.emit(next);
    };

    const up = () => {
      this.dragging = false;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);
    const next = mobile ? window.innerWidth : clampWidth(this.width());
    this.width.set(next);
    this.widthChange.emit(next);
  }
}
