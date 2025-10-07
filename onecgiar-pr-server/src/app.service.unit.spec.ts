import { AppService } from './app.service';

describe('AppService (unit)', () => {
  it('getHello should return greeting message', () => {
    const service = new AppService();
    expect(service.getHello()).toBe('Hello World!');
  });
});
