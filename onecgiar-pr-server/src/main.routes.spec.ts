import { MainRoutes } from './main.routes';
import { AuthModule } from './auth/auth.module';
import { ClarisaRoutes } from './clarisa/clarisa.routes';

describe('MainRoutes', () => {
  it('should contain auth route pointing to AuthModule', () => {
    const authRoute = MainRoutes.find((route) => route.path === 'auth');

    expect(authRoute).toBeDefined();
    expect(authRoute?.module).toBe(AuthModule);
  });

  it('should expose clarisa nested routes', () => {
    const clarisaRoute = MainRoutes.find((route) => route.path === 'clarisa');

    expect(clarisaRoute).toBeDefined();
    expect(clarisaRoute?.children).toBe(ClarisaRoutes);
  });

  it('should not duplicate top-level paths', () => {
    const paths = MainRoutes.map((route) => route.path);
    const unique = new Set(paths);

    expect(unique.size).toBe(paths.length);
  });
});
