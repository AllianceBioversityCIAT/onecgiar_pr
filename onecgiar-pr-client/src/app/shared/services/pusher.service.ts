import { Injectable } from '@angular/core';
import { environment } from '../../..//environments/environment';
import { Router } from '@angular/router';
import { ApiService } from './api/api.service';

declare const Pusher: any;

@Injectable({
  providedIn: 'root'
})
export class PusherService {
  pusher: any;
  channel: any;
  presenceChannel: any;

  constructor(private router: Router, private api: ApiService) {}

  beforeRoute = null;
  isTOC = false;

  membersList = [];
  continueEditing = false;
  firstUser = false;
  secondUser = null;

  validaeFirstUserToEdit() {
    if (!this.presenceChannel?.members) return false;
    const { members, myID } = this.presenceChannel?.members;
    if (!Object.keys(members).length) return true;

    const membersList: any = [];

    Object.keys(members).forEach(item => {
      const date = new Date(members[item]?.today);

      membersList.push({
        userId: item,
        date: date,
        name: members[item]?.name,
        nameinitials: this.textToinitials(members[item]?.name)
      });
    });

    const sortByDate = arr => {
      const sorter = (a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      };
      arr.sort(sorter);
    };

    sortByDate(membersList);
    this.membersList = membersList;
    this.firstUser = membersList[0]?.userId == myID;
    if (!this.firstUser) this.secondUser = true;
    if (this.firstUser && this.secondUser) {
      const currentUrl = this.router.url;
      this.router.navigateByUrl(`/result/result-detail/${this.api.resultsSE.currentResultId}`).then(() => {
        setTimeout(() => {
          this.router.navigateByUrl(currentUrl);
        }, 1000);
      });
    }
    return membersList[0]?.userId == myID;
  }

  textToinitials(text) {
    return text
      .split(' ')
      .map(item => item[0])
      .join('');
  }

  pusherToc: any;
  instancePusher() {
    this.pusherToc = new Pusher(environment.pusher.key, {
      authEndpoint: `${environment.apiBaseUrl}/auth/signin/pusher/result/${this.api.resultsSE.currentResultId}`,
      cluster: environment.pusher.cluster,
      encrypted: true
    });
  }

  start(PRRoute: string, resultId) {
    if (this.beforeRoute) this.pusher.disconnect();
    if (this.beforeRoute) this.pusher.unsubscribe('presence-prms' + this.beforeRoute);

    PRRoute = PRRoute.split('/').join('').split('-').join('');
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      encrypted: true,
      channelAuthorization: {
        endpoint: `${environment.apiBaseUrl}auth/signin/pusher/result/${resultId}/${this.api.authSE.localStorageUser.id}`
      }
    });

    this.presenceChannel = this.pusher.subscribe('presence-prms' + PRRoute);
    this.beforeRoute = PRRoute;
  }
}
