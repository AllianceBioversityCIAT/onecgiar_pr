import { Injectable } from '@angular/core';
interface alertOptions {
  id;
  title;
  description?: string;
  status: 'error' | 'success';
  querySelector: string;
}
@Injectable({
  providedIn: 'root'
})
export class CustomizedAlertsFsService {
  //TODO customized alerts for status
  showed = false;
  constructor() {}

  show(alertOptions: alertOptions, callback?) {
    let { id, title, description = '', status, querySelector } = alertOptions;
    this.showed = true;
    let alert = document.getElementById(id);

    let appRoot = document.querySelector(querySelector);
    appRoot.insertAdjacentHTML(
      'beforebegin',
      `
      <div class="pr_alert" id="${id}">
        <div class="text">${description}</div>
        <i class="material-icons-round icon">info</i>
      </div>
      `
    );
    alert = document.getElementById(id);

    alert.addEventListener('animationend', () => {
      if (!this.showed) {
        alert.classList.remove('animate__animated', 'animate__bounceIn', 'animate__bounceOut');
        alert.style.display = 'none';
        alert.parentNode.removeChild(alert);
      }
    });
  }

  hide(id) {
    this.showed = false;
    let alert: any = document.getElementById(`alert-${id}`);
    if (alert) alert.classList.add('animate__animated', 'animate__bounceOut');
  }
}
