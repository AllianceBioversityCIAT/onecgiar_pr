import { ClarisaRoutes } from './clarisa.routes';
import { ClarisaGlobalUnitModule } from './clarisa-global-unit/clarisa-global-unit.module';

describe('ClarisaRoutes', () => {
  it('should expose route for global units module', () => {
    const globalUnitRoute = ClarisaRoutes.find(
      (route) => route.path === 'global-unit',
    );

    expect(globalUnitRoute).toBeDefined();
    expect(globalUnitRoute?.module).toBe(ClarisaGlobalUnitModule);
  });

  it('should keep routes unique by path', () => {
    const paths = ClarisaRoutes.map((route) => route.path);
    const uniquePaths = new Set(paths);

    expect(uniquePaths.size).toBe(paths.length);
  });
});
