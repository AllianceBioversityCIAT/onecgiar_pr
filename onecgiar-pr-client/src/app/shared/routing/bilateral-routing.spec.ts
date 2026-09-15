import { BilateralRouting } from './routing-data';

/**
 * `COV-R-1` A — the Overview route is added *in front of* the existing center routes without
 * changing what any of them resolve to. The `**` redirect in particular keeps landing on `home`
 * (Reporting): `/bilateral/:acronym` with no segment must not start opening the Overview.
 */
describe('BilateralRouting — Overview route (COV-R-1 A)', () => {
  it('registers Overview as the first route, hidden from the nav', () => {
    expect(BilateralRouting[0].path).toBe('overview');
    expect(BilateralRouting[0].prName).toBe('Bilateral Overview');
    expect(BilateralRouting[0].prHide).toBe(true);
    expect(typeof BilateralRouting[0].loadComponent).toBe('function');
  });

  it('keeps the wildcard redirecting to home', () => {
    const wildcard = BilateralRouting.find(route => route.path === '**');
    expect(wildcard).toBeDefined();
    expect(wildcard?.redirectTo).toBe('home');
    expect(wildcard?.pathMatch).toBe('full');
  });

  it('keeps every previously registered center path', () => {
    const paths = BilateralRouting.map(route => route.path);
    expect(paths).toEqual([
      'overview',
      'home',
      'create',
      'result/:id',
      'drafts',
      'drafts/:draftId',
      'results',
      '**',
    ]);
  });
});
