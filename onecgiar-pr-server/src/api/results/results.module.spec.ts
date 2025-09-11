import { JwtMiddleware } from '../../auth/Middlewares/jwt.middleware';
import { ResultsModule } from './results.module';

class MockConsumer {
  public applied: any[] = [];
  apply(mw: any) {
    this.applied.push(mw);
    return {
      forRoutes: (...routes: any[]) => {
        // Save the set of routes passed in this call
        this.applied.push({ routes });
      },
    } as any;
  }
}

describe('ResultsModule (configure)', () => {
  it('applies JwtMiddleware to expected route prefixes', () => {
    const module = new ResultsModule();
    const consumer = new MockConsumer();
    module.configure(consumer as any);

    // First entry is the middleware class
    expect(consumer.applied[0]).toBe(JwtMiddleware);
    // Second entry stores the routes passed in a single forRoutes call
    const { routes } = consumer.applied[1];
    const paths = routes.map((r: any) => r.path);
    expect(paths).toEqual([
      '/api/results/*',
      '/api/clarisa/*',
      '/api/ipsr/*',
      '/logs/*',
    ]);
  });
});
