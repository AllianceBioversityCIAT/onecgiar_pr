import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, timeout } from 'rxjs';
import { getProgramCode } from '../constants/notification-type.constants';
import { bilateralRouteToUrl, buildCenterEditorRoute, buildReviewDrawerRoute } from '../routing/bilateral-result-open-route.util';
import { BilateralApiService } from './api/bilateral-api.service';

/** Navigation side (bell, list) gives up on the lead-center lookup after this and uses the fallback URL. */
export const DECISION_URL_TIMEOUT_MS = 8000;

/**
 * Click destinations for bilateral notifications (spec bugfix/notification-decision-deeplinks).
 * Shared by the header bell and the Notifications list so the rule lives in one place.
 */
@Injectable({ providedIn: 'root' })
export class NotificationNavigationService {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly router = inject(Router);

  /** Review drawer URL for "submitted for your review"; null when the payload has no SP code. */
  reviewRequestUrl(notification: any): string | null {
    const programCode = getProgramCode(notification);
    if (!programCode) return null;
    const resultCode = notification?.obj_result?.result_code;
    return bilateralRouteToUrl(buildReviewDrawerRoute(programCode, resultCode, notification?.result_id));
  }

  /**
   * Result Detail URL (IPSR types 10/11 keep their own base). Also the fallback for a decision
   * click whose lead center cannot be resolved. Null when the payload has no result code.
   */
  resultDetailUrl(notification: any): string | null {
    const resultCode = notification?.obj_result?.result_code;
    if (!resultCode) return null;

    const phase = notification?.obj_result?.obj_version?.id;
    const typeId = notification?.obj_result?.obj_result_type?.id;
    const base = typeId === 10 || typeId === 11 ? '/ipsr/detail' : '/result/result-detail';

    return `${base}/${resultCode}/general-information?phase=${phase}`;
  }

  /**
   * Center editor URL for an Approved / Rejected decision, resolved through the lead center.
   * Empty centers or a failing request emit the Result Detail URL; never errors.
   */
  decisionUrl$(notification: any): Observable<string | null> {
    const fallback = this.resultDetailUrl(notification);
    const resultCode = notification?.obj_result?.result_code;
    const phase = notification?.obj_result?.obj_version?.id;

    // A primary/contributor request carries the creating center with the route's own acronym
    // ("Bioversity (Alliance)"). The centers lookup below returns the institution acronym
    // ("Bioversity"), which the bilateral route does not recognise, so it is only the fallback.
    const creatingCenter = notification?.creating_center?.acronym;
    if (creatingCenter && resultCode) {
      return of(bilateralRouteToUrl(buildCenterEditorRoute(creatingCenter, resultCode, phase)));
    }

    return this.bilateralApi.GET_centersByResultId(notification?.result_id).pipe(
      map(response => {
        const centers = response?.response ?? [];
        const leadCenter = centers.find(center => !!center?.is_leading_result) ?? centers[0];
        const acronym = leadCenter?.acronym || leadCenter?.code;
        return acronym && resultCode ? bilateralRouteToUrl(buildCenterEditorRoute(acronym, resultCode, phase)) : fallback;
      }),
      catchError(() => of(fallback))
    );
  }

  /** W3/Bilaterals results are edited in the center editor, not in Result Detail. */
  isBilateralResult(notification: any): boolean {
    return notification?.obj_result?.source_name === 'W3/Bilaterals';
  }

  /**
   * Opens the result in its lead center's editor in a new tab. The tab is opened synchronously
   * (the popup blocker only allows that inside the click) and pointed at the URL once it resolves.
   * A blocked tab falls back to the current tab; a failed lookup falls back to Result Detail.
   */
  openCenterEditorInNewTab(notification: any): void {
    const fallback = this.resultDetailUrl(notification);
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;

    this.decisionUrl$(notification)
      .pipe(
        timeout(DECISION_URL_TIMEOUT_MS),
        catchError(() => of(fallback))
      )
      .subscribe(resolved => {
        const url = resolved ?? fallback;
        if (!url) {
          tab?.close();
          return;
        }
        if (tab) tab.location.href = `${window.location.origin}${url}`;
        else this.router.navigateByUrl(url);
      });
  }
}
