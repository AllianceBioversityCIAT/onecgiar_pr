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
    // console.log(this.membersList)
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
    // membersList[0]?.userId == myID || (!this._initiativesService.initiative.userRoleName && !this._authService.lsUserRoles.name) || (!this._initiativesService.initiative.userRoleName && this._authService.lsUserRoles.name == 'Guest') || this._initiativesService.initiative.readonly;
    return true;
  }

  textToinitials(text) {
    return text
      .split(' ')
      .map(item => item[0])
      .join('');
  }

  // beforeTocChanel = ''
  // listenTocChange(sectionName: string, callback, subItemId?: string | number) {
  //   if (this.pusherToc) this.pusherToc.disconnect();

  //   this.instancePusher();
  //   const channelName = `${sectionName}-${this._initiativesService.initiative.id}${subItemId ? `-${subItemId}` : ``}`;
  //   const channel = this.pusherToc.subscribe(channelName);
  //   console.log(`In: ${channelName}`);
  //   channel.bind('updateToc', data => {
  //     callback();
  //   });
  // }
  pusherToc: any;
  instancePusher() {
    this.pusherToc = new Pusher(environment.pusher.key, {
      authEndpoint: `${environment.apiBaseUrl}/auth/signin/pusher/result/${this.api.resultsSE.currentResultId}`,
      cluster: environment.pusher.cluster,
      encrypted: true
    });
  }

  start(OSTRoute: string, resultId) {
    const pusherBlocked = new PusherBlocked(OSTRoute);
    this.isTOC = pusherBlocked.blockedRoute();
    if (this.beforeRoute) this.pusher.unsubscribe('presence-prms' + this.beforeRoute);
    // if (pusherBlocked.blockedRoute()) return;

    OSTRoute = OSTRoute.split('/').join('').split('-').join('');
    this.pusher = new Pusher(environment.pusher.key, {
      cluster: environment.pusher.cluster,
      encrypted: true,
      channelAuthorization: {
       endpoint: `${environment.apiBaseUrl}auth/signin/pusher/result/${resultId}/71`,
      //endpoint: `http://localhost:3000/api/auth/pusherauth/9/72`,
        /*headers: {
          auth: this.api.authSE.localStorageToken
        }*/
      }
    });
      console.log('presence-prms' + OSTRoute);
    
      this.presenceChannel = this.pusher.subscribe('presence-prms' + OSTRoute);
      this.beforeRoute = OSTRoute;
      console.log(this.presenceChannel);
      console.log(this.presenceChannel?.members);


  }

  // stop() {
  //   // this.pusher.unsubscribe('presence-ost'+OSTRoute);
  // }

  // updateStatus(tocStatus) {
  //   this.http
  //     .post(`${environment.apiBaseUrl}/auth/pusher/update`, {
  //       tocStatus: tocStatus
  //     })
  //     .subscribe(data => {});
  // }
}
