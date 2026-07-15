import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Default Angular route-reuse everywhere, EXCEPT when navigating between two
 * `result-detail/:id` routes with a different id — there we force the component
 * to be re-created. `result-detail.component.ts` reads its id from
 * `activatedRoute.snapshot` (read once in ngOnInit), so without this the view
 * would keep showing the previous result when the assistant opens another one.
 *
 * This only affects result-detail → result-detail with a changed id (a case that
 * was already broken by the stale snapshot); every other navigation keeps the
 * default behavior via `super`.
 */
export class PrmsRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    const reuse = super.shouldReuseRoute(future, curr);
    if (reuse && future.routeConfig?.path === 'result-detail/:id') {
      return future.params['id'] === curr.params['id'];
    }
    return reuse;
  }
}
