import { Component, Input } from '@angular/core';
import { MessageService } from 'primeng/api';

interface Header {
  attr: string;
  name: string;
  type: 'normal' | 'url';
}

@Component({
  selector: 'app-simple-table-with-clipboard',
  templateUrl: './simple-table-with-clipboard.component.html',
  styleUrls: ['./simple-table-with-clipboard.component.scss'],
  providers: [MessageService]
})
export class SimpleTableWithClipboardComponent {
  @Input() distribution: 'left' | 'normal' = 'normal';
  @Input() tableTitle: string;
  @Input() header = [];
  @Input() loadingData = false;
  @Input() data = [];
  flatFormat = false;

  constructor(private readonly messageService: MessageService) {}

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
