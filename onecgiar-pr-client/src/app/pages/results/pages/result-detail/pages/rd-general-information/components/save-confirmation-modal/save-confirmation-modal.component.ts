import { Component } from '@angular/core';

@Component({
  selector: 'app-save-confirmation-modal',
  templateUrl: './save-confirmation-modal.component.html',
  styleUrls: ['./save-confirmation-modal.component.scss'],
  standalone: false
})
export class SaveConfirmationModalComponent {
  visible = false;
  private confirmCallback: (() => void) | null = null;

  constructor() {}

  show(callback?: () => void) {
    this.confirmCallback = callback || null;
    this.visible = true;
  }

  hide() {
    this.visible = false;
    this.confirmCallback = null;
  }

  onConfirm() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.hide();
  }

  onCancel() {
    this.hide();
  }
}

