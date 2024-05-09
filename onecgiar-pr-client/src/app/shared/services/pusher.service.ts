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
    //(this.presenceChannel?.members);
    if (!this.presenceChannel?.members) return false;
    const { members, myID } = this.presenceChannel?.members;

    // if (this.firstUser) return true;
    if (!Object.keys(members).length) return true;
    //(members)

    const membersList: any = [];

    Object.keys(members).map(item => {
      const date = new Date(members[item]?.today);
      // let initiativeRoles: any[] = [];
      // initiativeRoles = members[item]?.initiativeRoles;

      let generalRoles: any[] = [];
      generalRoles = members[item]?.roles;

      // TODO: Tener ene cuenta estado de la iniciativa
      const oldDate = new Date('4000-05-31T20:40:34.081Z');
      //(members)

      membersList.push({
        userId: item,
        date: date,
        // initiativeRoles?.length ? (initiativeRoles[0]?.name !== 'Guest' ? date : oldDate) : generalRoles?.length ? (generalRoles[0]?.name == 'Admin' ? date : oldDate) : oldDate
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
    //(this.firstUser +' - '+this.secondUser)
    if (!this.firstUser) this.secondUser = true;
    if (this.firstUser && this.secondUser) {
      const currentUrl = this.router.url;
      //(currentUrl);
      this.router.navigateByUrl(`/result/result-detail/${this.api.resultsSE.currentResultId}`).then(() => {
        setTimeout(() => {
          //('volver');
          //(currentUrl);
          this.router.navigateByUrl(currentUrl);
        }, 1000);
      });
    }
    //(membersList);
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
    // this.pusher.disconnect();
    if (this.beforeRoute) this.pusher.disconnect();
    if (this.beforeRoute) this.pusher.unsubscribe('presence-prms' + this.beforeRoute);
    // if (pusherBlocked.blockedRoute()) return;

    PRRoute = PRRoute.split('/').join('').split('-').join('');
    //(this.api.authSE.localStorageUser.id);
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      encrypted: true,
      channelAuthorization: {
        endpoint: `${environment.apiBaseUrl}auth/signin/pusher/result/${resultId}/${this.api.authSE.localStorageUser.id}`
      }
    });
    //('presence-prms' + PRRoute);

    this.presenceChannel = this.pusher.subscribe('presence-prms' + PRRoute);
    this.beforeRoute = PRRoute;
    //(this.presenceChannel);
    //(this.presenceChannel?.members);
  }
}
