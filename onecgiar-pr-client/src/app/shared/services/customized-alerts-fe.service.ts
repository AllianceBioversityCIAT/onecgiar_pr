import { Injectable } from '@angular/core';
export interface AlertOptions {
  id;
  title;
  description?: string;
  closeIn?: number;
  status: 'error' | 'success' | 'warning' | 'information';
  confirmText?: string;
  hideCancelButton?: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class CustomizedAlertsFeService {
  statusIcons = [];
  constructor() {
    this.statusIcons['error'] = 'priority_high';
    this.statusIcons['success'] = 'check';
    this.statusIcons['warning'] = 'priority_high';
    this.statusIcons['information'] = 'priority_high';
  }

  show(alertOptions: AlertOptions, callback?) {
    const { id, title, description = '', closeIn, status, confirmText, hideCancelButton = false } = alertOptions;
    // this.showed = true;
    let alert = document.getElementById(id);

    const appRoot = document.getElementsByTagName('app-root')[0];
    appRoot.insertAdjacentHTML(
      'beforeend',
      `
      <div class="custom_modal_container active" id="${id}">
        <div class="custom-alert animate__animated animate__bounceIn"  id="alert-${id}">
          <div class="top-line ${status}"></div>
          <div class="alert-content ${status}">
            <div class="icon"><i class="material-icons-round">${this.statusIcons[status]}</i></div>
            <div class="title">${title}</div>
            <div class="description">${description}</div>
          </div>
          <div class="options">
            <div class="close_button accept_button" id="close-${id}">Ok</div>
            <div class="close_button cancel_button" style="display:none" id="cancel-${id}">Cancel</div>
            <div class="close_button confirm_button" style="display:none" id="confirm-${id}">${confirmText}</div>
          </div>
        </div>
        <div class="bg animate__animated animate__fadeIn" id="bg-${id}"></div>
      </div>
      `
    );
    alert = document.getElementById(id);
    if (confirmText) {
      document.getElementById(`close-${id}`).style.display = 'none';

      document.getElementById(`cancel-${id}`).style.display = 'block';
      document.getElementById(`confirm-${id}`).style.display = 'block';
    }
    if (hideCancelButton) {
      document.getElementById(`cancel-${id}`).style.display = 'none';
    }
    document.getElementById(`bg-${id}`).addEventListener('click', () => {
      this.closeAction(id);
    });
    document.getElementById(`close-${id}`).addEventListener('click', () => {
      this.closeAction(id);
    });
    document.getElementById(`cancel-${id}`).addEventListener('click', () => {
      this.closeAction(id);
    });
    document.getElementById(`confirm-${id}`).addEventListener('click', () => {
      this.closeAction(id);
      callback();
    });
    if (closeIn)
      setTimeout(() => {
        this.closeAction(id);
      }, 3000);

    alert.addEventListener('animationend', () => {
      if (alert.classList.contains('delete')) {
        alert.classList.remove('animate__animated', 'animate__bounceIn', 'animate__bounceOut');
        alert.style.display = 'none';
        alert.parentNode.removeChild(alert);
      }
    });
  }

  closeAction(id) {
    const alertModal: any = document.getElementById(`alert-${id}`);
    if (alertModal) alertModal.classList.add('animate__animated', 'animate__bounceOut');
    const alert: any = document.getElementById(`${id}`);
    if (alert) alert.classList.add('delete');
  }
}
