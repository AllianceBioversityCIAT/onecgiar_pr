import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-pr-button',
  templateUrl: './pr-button.component.html',
  styleUrls: ['./pr-button.component.scss']
})
export class PrButtonComponent implements OnInit {
  @Input() text: string;
  @Input() icon: string;
  @Input() reverse: boolean = false;
  @Input() rotating: boolean = false;
  @Input() rotateRight: boolean = false;
  @Input() underConstruction: boolean = false;
  @Input() showBackground: boolean = true;
  @Input() colorType: 'primary' | 'danger' | 'secondary' | 'success' = 'primary';
  @Input() padding: 'small' | 'medium' | 'big' = 'small';
  @Input() pulse: boolean = false;
  @Input() verticalMargin: number = 10;
  @Input() disabled: boolean = false;
  @Input() tooltipText: string = '';
  @Input() tooltipTextPosition: 'right' | 'left' | 'top' | 'bottom' = 'top';
  @Input() tooltipStyleClass: string = '';
  @Output() clickEvent = new EventEmitter<any>();

  png_icons = ['excel_white'];
  use_png_icon = false;

  ngOnInit(): void {
    this.icon && (this.use_png_icon = this.png_icons.includes(this.icon));
  }

  onClick() {
    if (!this.disabled) this.clickEvent.emit();
  }
}
