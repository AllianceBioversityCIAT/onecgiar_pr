import { ClarisaRegion } from '../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { WorldRegionTree } from './world-region-tree';

describe('WorldRegionTree', () => {
  const makeRegion = (code: number) => {
    const r = new ClarisaRegion();
    r.um49Code = code;
    return r;
  };

  it('findById should find by um49Code', () => {
    const root = makeRegion(1);
    const tree = new WorldRegionTree(root);
    tree.add(makeRegion(2), makeRegion(1));

    const node = tree.findById(2);
    expect(node?.data?.um49Code).toBe(2);
  });

  it('getAllDescendantRegions should return [] and log an error when the region does not exist', () => {
    const tree = new WorldRegionTree(makeRegion(1));
    const errorSpy = jest
      .spyOn((tree as any)._logger, 'error')
      .mockImplementation(() => undefined as any);

    const res = tree.getAllDescendantRegions(makeRegion(999));
    expect(res).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('getAllDescendantRegions should support onlyLeafs=true', () => {
    const tree = new WorldRegionTree(makeRegion(1));
    tree.add(makeRegion(2), makeRegion(1));
    tree.add(makeRegion(3), makeRegion(2));
    tree.add(makeRegion(4), makeRegion(1));

    const all = tree.getAllDescendantRegions(makeRegion(1), false);
    const leafs = tree.getAllDescendantRegions(makeRegion(1), true);

    expect(all.map((r) => r.um49Code).sort((a, b) => a - b)).toEqual([3, 4]);
    expect(leafs.map((r) => r.um49Code).sort((a, b) => a - b)).toEqual([3, 4]);
  });
});
