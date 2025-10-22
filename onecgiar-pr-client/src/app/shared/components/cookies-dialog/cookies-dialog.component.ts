import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-cookies-dialog',
  imports: [DialogModule, ButtonModule],
  templateUrl: './cookies-dialog.component.html',
  styleUrl: './cookies-dialog.component.scss'
})
export class CookiesDialogComponent {
  visible: boolean = true;

  position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright' = 'center';

  showDialog(position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'topleft' | 'topright' | 'bottomleft' | 'bottomright') {
    this.position = position;
    this.visible = true;
  }
}
