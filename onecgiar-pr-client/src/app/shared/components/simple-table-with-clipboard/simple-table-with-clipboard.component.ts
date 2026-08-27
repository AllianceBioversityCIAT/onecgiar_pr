import { Component, Input, signal } from '@angular/core';
import { PrToastService } from 'src/app/shared/components/pr-toast';

interface Header {
  attr: string;
  name: string;
  type: 'normal' | 'url';
}

@Component({
    selector: 'app-simple-table-with-clipboard',
    templateUrl: './simple-table-with-clipboard.component.html',
    styleUrls: ['./simple-table-with-clipboard.component.scss'],
    standalone: false
})
export class SimpleTableWithClipboardComponent {
  @Input() distribution: 'left' | 'normal' = 'normal';
  @Input() tableTitle: string;
  @Input() header = [];
  @Input() loadingData = false;
  @Input() data = [];
  // P2-3322 (2026): signal-backed flag. `copyTable()` sets it to `true` (from a real click, which
  // still notifies) and clears it inside nested `setTimeout`s, and the template reads it at the
  // `[ngClass]` of the wrapper (`.flatFormat`, which strips the table styling while it is copied).
  // As a plain field the delayed write notified nothing, so under zoneless change detection the
  // table stayed stuck in the flat layout after copying. The public API stays a plain boolean, so
  // the template and the existing specs are untouched.
  private readonly _flatFormat = signal<boolean>(false);
  get flatFormat(): boolean {
    return this._flatFormat();
  }
  set flatFormat(value: boolean) {
    this._flatFormat.set(value);
  }

  constructor(private readonly messageService: PrToastService) {}

  copyTable(table) {
    this.flatFormat = true;

    setTimeout(() => {
      const range = new Range();

      range.setStart(table, 0);
      range.setEnd(table, table.childNodes.length);
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(range);
      document.execCommand('copy');
      this.messageService.add({ key: 'myKey1', severity: 'info', summary: 'Copied', detail: 'Table copied to clipboard' });
      document.getSelection().removeAllRanges();
      setTimeout(() => {
        this.flatFormat = false;
      }, 200);
    }, 200);
  }

  validateObj(value) {
    return typeof value == 'object';
  }

  getIndexColumnClass() {
    return 'custom-class-1';
  }
}
