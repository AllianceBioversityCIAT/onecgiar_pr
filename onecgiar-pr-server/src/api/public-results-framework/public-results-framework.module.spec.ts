import 'reflect-metadata';
import { PublicResultsFrameworkModule } from './public-results-framework.module';
import { PublicResultsFrameworkController } from './public-results-framework.controller';
import { ResultsFrameworkReportingModule } from '../results-framework-reporting/results-framework-reporting.module';

describe('PublicResultsFrameworkModule', () => {
  it('should wire the public controller', () => {
    const controllers =
      Reflect.getMetadata('controllers', PublicResultsFrameworkModule) ?? [];
    expect(controllers).toEqual(
      expect.arrayContaining([PublicResultsFrameworkController]),
    );
  });

  it('should import the ResultsFrameworkReportingModule to reuse its service', () => {
    const importsMetadata =
      Reflect.getMetadata('imports', PublicResultsFrameworkModule) ?? [];
    expect(importsMetadata).toEqual(
      expect.arrayContaining([ResultsFrameworkReportingModule]),
    );
  });

  it('should NOT declare its own providers (it reuses the imported service)', () => {
    const providers =
      Reflect.getMetadata('providers', PublicResultsFrameworkModule) ?? [];
    expect(providers).toHaveLength(0);
  });
});
