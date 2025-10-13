import { ClarisaEndpoints } from './clarisa-endpoints.enum';
import { ClarisaGlobalUnit } from './clarisa-global-unit/entities/clarisa-global-unit.entity';

describe('ClarisaEndpoints', () => {
  it('should expose global units endpoint pointing to version 2', () => {
    const endpoint = ClarisaEndpoints.GLOBAL_UNITS;

    expect(endpoint.path).toBe('cgiar-entities');
    expect(endpoint.method).toBe('GET');
    expect(endpoint.entity).toBe(ClarisaGlobalUnit);
    expect(endpoint.params).toMatchObject({ version: 2 });
  });

  it('should keep institution endpoint configured to fetch all records', () => {
    const endpoint = ClarisaEndpoints.INSTITUTIONS_FULL;

    expect(endpoint.path).toBe('institutions');
    expect(endpoint.params).toMatchObject({ show: 'all' });
    expect(typeof endpoint.mapper).toBe('function');
  });
});
