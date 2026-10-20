// @akili-spec changes/replicated-innovation-reminders
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoleByUserModule } from '../../auth/modules/role-by-user/role-by-user.module';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { EmailNotificationManagementModule } from '../../shared/microservices/email-notification-management/email-notification-management.module';
import { EmailNotificationManagementService } from '../../shared/microservices/email-notification-management/email-notification-management.service';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { TemplateRepository } from '../platform-report/repositories/template.repository';
import { Version } from '../versioning/entities/version.entity';
import { ReplicatedInnovationRemindersController } from './replicated-innovation-reminders.controller';
import { ReplicatedInnovationReminderCron } from './replicated-innovation-reminders.cron';
import { ReplicatedInnovationRemindersModule } from './replicated-innovation-reminders.module';
import { ReplicatedInnovationRemindersService } from './replicated-innovation-reminders.service';

/**
 * `RIR-T-5` — the DI graph. The module's own controllers and providers are compiled with every
 * foreign dependency replaced by a stub, and the module metadata is asserted to import the modules
 * that supply those foreign dependencies. (`app.module.spec.ts` covers the metadata of the root.)
 */
describe('ReplicatedInnovationRemindersModule', () => {
  const read = (key: string) =>
    Reflect.getMetadata(key, ReplicatedInnovationRemindersModule) as unknown[];

  it('imports the modules that supply the guard, mail and phase dependencies', () => {
    expect(read('imports')).toEqual(
      expect.arrayContaining([
        RoleByUserModule,
        EmailNotificationManagementModule,
      ]),
    );
  });

  it('compiles: every provider of the module resolves its constructor dependencies', async () => {
    const own = read('providers') as any[];
    const foreign = [
      TemplateRepository,
      GlobalParameterRepository,
      HandlersError,
    ];
    const moduleRef = await Test.createTestingModule({
      controllers: read('controllers') as any[],
      providers: [
        ...own.filter((p) => !foreign.includes(p)),
        ...foreign.map((provide) => ({ provide, useValue: {} })),
        { provide: DataSource, useValue: { createEntityManager: jest.fn() } },
        { provide: getRepositoryToken(Version), useValue: {} },
        { provide: EmailNotificationManagementService, useValue: {} },
        { provide: RoleByUserRepository, useValue: {} },
      ],
    }).compile();

    expect(moduleRef.get(ReplicatedInnovationRemindersService)).toBeDefined();
    expect(moduleRef.get(ReplicatedInnovationReminderCron)).toBeDefined();
    expect(
      moduleRef.get(ReplicatedInnovationRemindersController),
    ).toBeDefined();
  });
});
