// @akili-spec changes/admin-reminders-page (ARP-T-1): route table
import { adminModuleRouting, extraRoutingApp } from './routing-data';

describe('admin module reminders route', () => {
  const idx = (path: string) => adminModuleRouting.findIndex(r => r.path === path);

  it('registers reminders before the ** fallback', () => {
    expect(idx('reminders')).toBeGreaterThan(-1);
    expect(idx('reminders')).toBeLessThan(idx('**'));
  });

  it('sits right after phase-management', () => {
    expect(idx('reminders')).toBe(idx('phase-management') + 1);
  });

  it('lazy-loads a standalone component and has no own canActivate (inherits CheckAdminGuard from admin-module)', () => {
    const route = adminModuleRouting[idx('reminders')];
    expect(route.loadComponent).toBeDefined();
    expect(route.canActivate).toBeUndefined();
    const parent = extraRoutingApp.find(r => r.path === 'admin-module');
    expect(parent?.canActivate?.length).toBeGreaterThan(0);
  });
});
