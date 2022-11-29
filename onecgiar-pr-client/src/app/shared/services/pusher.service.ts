import { Injectable } from '@angular/core';
import { environment } from '../../..//environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { PusherBlocked } from './variables/pusher-blocked-routes';
import { ApiService } from './api/api.service';

declare const Pusher: any;

@Injectable({
  providedIn: 'root'
})
export class PusherService {
  pusher: any;
  channel: any;
  presenceChannel: any;

  constructor(private http: HttpClient, private router: Router, private api: ApiService) {}

  beforeRoute = null;
  isTOC = false;

  membersList = [];
  continueEditing = false;
  firstUser = false;
  secondUser = null;
  validaeFirstUserToEdit() {
    // console.log(this.presenceChannel?.members);
    if (!this.presenceChannel?.members) return false;
    let { members, myID } = this.presenceChannel?.members;

    // if (this.firstUser) return true;
    if (!Object.keys(members).length) return true;
    // console.log(members)

    let membersList: any = [];

    Object.keys(members).map(item => {
      const date = new Date(members[item]?.today);
      let initiativeRoles: any[] = [];
      initiativeRoles = members[item]?.initiativeRoles;

      let generalRoles: any[] = [];
      generalRoles = members[item]?.roles;

      // TODO: Tener ene cuenta estado de la iniciativa
      let oldDate = new Date('4000-05-31T20:40:34.081Z');
      // console.log(members)

      membersList.push({
        userId: item,
        date: initiativeRoles?.length ? (initiativeRoles[0]?.name !== 'Guest' ? date : oldDate) : generalRoles?.length ? (generalRoles[0]?.name == 'Admin' ? date : oldDate) : oldDate,
        // role: this._initiativesService.initiative.status == 'Approved' ? 'Guest' : initiativeRoles?.length ? initiativeRoles[0]?.name : generalRoles?.length ? (generalRoles[0]?.name == 'Admin' ? generalRoles[0]?.name : 'Guest') : 'Guest',
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
    // console.log(this.firstUser +' - '+this.secondUser)
    if (!this.firstUser) this.secondUser = true;
    if (this.firstUser && this.secondUser) {
      let currentUrl = this.router.url;
      this.router.navigateByUrl(`/result/result-detail/${this.api.resultsSE.currentResultId}`).then(() => {
        setTimeout(() => {
          this.router.navigateByUrl(currentUrl);
        }, 100);
      });
    }
    // console.log(membersList);
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
    // const pusherBlocked = new PusherBlocked(OSTRoute);
    // this.isTOC = pusherBlocked.blockedRoute();
    if (this.beforeRoute) this.pusher.unsubscribe('presence-prms' + this.beforeRoute);
    // if (pusherBlocked.blockedRoute()) return;

    PRRoute = PRRoute.split('/').join('').split('-').join('');
    // console.log(this.api.authSE.localStorageUser.id);
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      encrypted: true,
      channelAuthorization: {
        endpoint: `${environment.apiBaseUrl}auth/signin/pusher/result/${resultId}/${this.api.authSE.localStorageUser.id}`
      }
    });
    // console.log('presence-prms' + PRRoute);

    this.presenceChannel = this.pusher.subscribe('presence-prms' + PRRoute);
    this.beforeRoute = PRRoute;
    // console.log(this.presenceChannel);
    // console.log(this.presenceChannel?.members);
  }
}
