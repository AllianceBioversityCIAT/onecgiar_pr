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
}
