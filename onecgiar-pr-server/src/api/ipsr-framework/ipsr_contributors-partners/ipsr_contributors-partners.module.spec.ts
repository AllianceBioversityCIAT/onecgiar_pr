import 'reflect-metadata';
import { IpsrContributorsPartnersModule } from './ipsr_contributors-partners.module';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { ContributorsPartnersModule } from '../../results-framework-reporting/contributors-partners/contributors-partners.module';

describe('IpsrContributorsPartnersModule', () => {
  it('should be defined', () => {
    expect(IpsrContributorsPartnersModule).toBeDefined();
  });

  it('should register the ipsr contributors partners controller', () => {
    const controllers =
      (Reflect.getMetadata(
        'controllers',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(controllers).toContain(IpsrContributorsPartnersController);
  });

  it('should register expected providers', () => {
    const providers =
      (Reflect.getMetadata(
        'providers',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(providers).toEqual(
      expect.arrayContaining([IpsrContributorsPartnersService]),
    );
  });

  it('should import ContributorsPartnersModule', () => {
    const imports =
      (Reflect.getMetadata(
        'imports',
        IpsrContributorsPartnersModule,
      ) as any[]) ?? [];

    expect(imports).toContain(ContributorsPartnersModule);
  });
});
