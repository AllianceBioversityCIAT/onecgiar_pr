import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Router } from '@angular/router';
import { User } from './classes/User';
import { MessageService } from 'primeng/api';
import { ApiService } from '../shared/services/api/api.service';
import { ResultsNotificationsService } from '../pages/results/pages/results-outlet/pages/results-notifications/results-notifications.service';
// import { CacheService } from '../services/cache.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  // cache = inject(CacheService);
  // socket = inject(Socket);
  socket = new Socket({
    // url: 'https://gvtpm71c-3005.use.devtunnels.ms/', options: {}
    url: 'https://fork-au-one-cgiar-microservices-production.up.railway.app/',
    options: {}
  });

  router = inject(Router);
  public socketStatus = false;
  public user: User | null = null;

  userList: WritableSignal<any> = signal([]);
  currentRoom: WritableSignal<any> = signal({ id: '', userList: [] });

  constructor(public api: ApiService, public messageService: MessageService, public resultsNotificationsService: ResultsNotificationsService) {
    this.runsockets();
  }

  runsockets() {
    this.checkStatus();
    this.getNotifications();
    this.getConnectedUsers();
    this.getAlerts();
    if (this.api.authSE?.localStorageUser?.user_name) {
      this.configUser(this.api.authSE.localStorageUser.user_name, this.api.authSE.localStorageUser.id);
    }
  }

  checkStatus() {
    this.socket.on('connect', () => {
      this.socketStatus = true;
    });

    this.socket.on('disconnect', () => {
      this.socketStatus = false;
    });
  }

  emit(event: string, payload?: any, callback?: Function) {
    this.socket.emit(event, payload, callback);
  }

  listen(event: string) {
    return this.socket.fromEvent(event);
  }

  configUser(name: string, userId: number) {
    return new Promise((resolve, reject) => {
      this.emit('config-user', { name, userId }, (resp: any) => {
        this.user = new User(name, userId);
        resolve(null);
      });
    });
  }

  logoutWS() {
    this.user = null;
    localStorage.removeItem('user');

    const payload = {
      name: 'nameless'
    };

    this.emit('config-user', payload, () => {});
    this.router.navigateByUrl('');
  }

  getUser() {
    return this.user;
  }

  getConnectedUsers() {
    this.listen('all-connected-users').subscribe(resp => {
      this.userList.set(resp);
    });
  }

  getAlerts() {
    this.listen('alert').subscribe((msg: any) => {
      alert(msg.text);
    });
  }

  getNotifications() {
    this.listen('notifications').subscribe((msg: { result: any; title: string; desc: string }) => {
      this.showToast1(msg);
      this.resultsNotificationsService.updatesPopUpData.push(msg.result);
      this.resultsNotificationsService.get_updates_notifications();
    });
  }

  showToast1(msg) {
    this.messageService.clear();
    this.messageService.add({ key: 'globalUserNotification', severity: 'info', summary: msg.title, detail: msg.desc });
  }
}
