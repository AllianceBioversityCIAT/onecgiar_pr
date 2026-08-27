import { ActivatedRouteSnapshot } from '@angular/router';
import { PrmsRouteReuseStrategy } from './prms-route-reuse.strategy';

const detailCfg = { path: 'result-detail/:id' };
const otherCfg = { path: 'quality-assurance' };

function snap(cfg: object, id?: string): ActivatedRouteSnapshot {
  return { routeConfig: cfg, params: id ? { id } : {} } as unknown as ActivatedRouteSnapshot;
}

describe('PrmsRouteReuseStrategy', () => {
  const strategy = new PrmsRouteReuseStrategy();

  it('does NOT reuse result-detail when the id changes', () => {
    expect(strategy.shouldReuseRoute(snap(detailCfg, '10'), snap(detailCfg, '8'))).toBe(false);
  });

  it('reuses result-detail when the id is the same', () => {
    expect(strategy.shouldReuseRoute(snap(detailCfg, '8'), snap(detailCfg, '8'))).toBe(true);
  });

  it('keeps default reuse (same config) for other routes', () => {
    expect(strategy.shouldReuseRoute(snap(otherCfg), snap(otherCfg))).toBe(true);
  });

  it('does not reuse across different route configs', () => {
    expect(strategy.shouldReuseRoute(snap(detailCfg, '8'), snap(otherCfg))).toBe(false);
  });
});
