import { IpsrListFilterService } from '../../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../../services/ipsr-list.service';
import { InnovationPackageListFilterPipe } from './innovation-package-list-filter.pipe';

describe('InnovationPackageListFilterPipe', () => {
  let pipe: InnovationPackageListFilterPipe;

  beforeEach(() => {
    pipe = new InnovationPackageListFilterPipe(new IpsrListService(), new IpsrListFilterService());
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });
});
