import { Injectable } from '@angular/core';
interface AlertOptions {
  id?;
  title;
  description?: string;
  status: 'error' | 'success';
  querySelector: string;
  position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';
}
@Injectable({
  providedIn: 'root'
})
export class CustomizedAlertsFsService {
  //TODO customized alerts for status
  showed = false;
  constructor() {}

  show(alertOptions: AlertOptions) {
    const { id, title, description = '', status, querySelector, position } = alertOptions;
    this.showed = true;
    let alert = document.getElementById(id);

    const appRoot = document.querySelector(querySelector);
    appRoot.insertAdjacentHTML(
      position,
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
    const alert: any = document.getElementById(`alert-${id}`);
    if (alert) alert.classList.add('animate__animated', 'animate__bounceOut');
  }
}
