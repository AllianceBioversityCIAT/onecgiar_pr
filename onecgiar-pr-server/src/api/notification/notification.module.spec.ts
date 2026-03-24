import 'reflect-metadata';
import { NotificationModule } from './notification.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

describe('NotificationModule', () => {
  it('should expose NotificationService through exports', () => {
    const exportsMetadata: unknown[] =
      Reflect.getMetadata('exports', NotificationModule) ?? [];
    expect(exportsMetadata).toEqual(
      expect.arrayContaining([NotificationService]),
    );
  });

  it('should register NotificationController as controller', () => {
    const controllersMetadata: unknown[] =
      Reflect.getMetadata('controllers', NotificationModule) ?? [];
    expect(controllersMetadata).toEqual(
      expect.arrayContaining([NotificationController]),
    );
  });

  it('should declare NotificationService as provider', () => {
    const providersMetadata: unknown[] =
      Reflect.getMetadata('providers', NotificationModule) ?? [];
    expect(providersMetadata).toEqual(
      expect.arrayContaining([NotificationService]),
    );
  });
});
