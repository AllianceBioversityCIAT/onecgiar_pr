import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { RolesService } from '../../../services/global/roles.service';
import { ASSISTANT_TOOLS, NAVIGATE_SECTIONS, navigateTool, SectionSlug, toolNameEnum } from './assistant-tools';

function fakeInjector(overrides: { router?: Partial<Router>; roles?: Partial<RolesService> } = {}): Injector {
  const router = overrides.router ?? { navigate: jest.fn().mockResolvedValue(true) };
  const roles = overrides.roles ?? { isAdmin: false };
  return {
    get: (token: unknown) => {
      if (token === Router) return router;
      if (token === RolesService) return roles;
      return null;
    }
  } as unknown as Injector;
}

describe('navigateTool', () => {
  it('registers the navigate, list_my_results and open_result tools', () => {
    expect(ASSISTANT_TOOLS.map(t => t.name)).toEqual(['navigate', 'list_my_results', 'open_result']);
  });

  it('maps every section slug to its exact route', async () => {
    const expected: Record<SectionSlug, string> = {
      'results-framework-reporting': '/result-framework-reporting',
      'results-center': '/result/results-outlet/results-list',
      'innovation-packages': '/ipsr',
      'quality-assurance': '/quality-assurance',
      'my-admin': '/init-admin-module',
      'admin-module': '/admin-module',
      'whats-new': '/whats-new',
      notifications: '/result/results-outlet/results-notifications/requests'
    };

    for (const section of NAVIGATE_SECTIONS) {
      const navigate = jest.fn().mockResolvedValue(true);
      const injector = fakeInjector({ router: { navigate } as unknown as Router, roles: { isAdmin: true } });
      const validation = navigateTool.validate({ section: section.slug }, injector);
      expect(validation.ok).toBe(true);
      await navigateTool.run({ section: section.slug }, injector);
      expect(navigate).toHaveBeenCalledWith([expected[section.slug]]);
    }
  });

  it('rejects an unknown section', () => {
    const result = navigateTool.validate({ section: 'nope' as SectionSlug }, fakeInjector());
    expect(result.ok).toBe(false);
  });

  it('rejects admin-module for a non-admin user', () => {
    const result = navigateTool.validate({ section: 'admin-module' }, fakeInjector({ roles: { isAdmin: false } }));
    expect(result.ok).toBe(false);
  });

  it('allows admin-module for an admin user', () => {
    const result = navigateTool.validate({ section: 'admin-module' }, fakeInjector({ roles: { isAdmin: true } }));
    expect(result.ok).toBe(true);
  });

  it('derives the tool enum from the registry', () => {
    expect(toolNameEnum()).toEqual(['none', 'navigate', 'list_my_results', 'open_result']);
  });

  it('constrains the section arg to the known slugs', () => {
    const enumValues = (navigateTool.argsSchema['section'] as { enum: string[] }).enum;
    expect(enumValues).toEqual(NAVIGATE_SECTIONS.map(s => s.slug));
  });
});
