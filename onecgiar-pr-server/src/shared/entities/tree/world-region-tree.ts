import { ClarisaRegion } from '../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { Node } from './node';
import { Tree } from './tree';

export class WorldRegionTree extends Tree<ClarisaRegion> {
  constructor(root: ClarisaRegion) {
    super(root);
  }

  protected dataEquals(obj1: ClarisaRegion, obj2: ClarisaRegion): boolean {
    if (!obj1) {
      if (!obj2) {
        return true;
      }
    }

    return obj1.um49Code == obj2.um49Code;
  }

  public findById(regionId: number): Node<ClarisaRegion> {
    const toFind: ClarisaRegion = new ClarisaRegion();
    toFind.um49Code = regionId;

    return this.find(toFind);
  }

  public getAllDescendantRegions(
    region: ClarisaRegion,
    onlyLeafs = false,
  ): ClarisaRegion[] {
    const nodeRegion = this.find(region);
    if (!nodeRegion) {
      this._logger.error(
        `The region with code ${region.um49Code} does not exist`,
      );
      return [];
    }

    let descendantNodes = this.getAllDescendants(nodeRegion);

    if (onlyLeafs) {
      descendantNodes = descendantNodes.filter((dn) => dn.isLeaf);
    }

    return descendantNodes.map((n) => n.data);
  }
}
