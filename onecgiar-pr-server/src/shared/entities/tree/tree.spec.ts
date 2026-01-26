import { Tree } from './tree';

describe('Tree', () => {
  it('find should return root when it matches', () => {
    const tree = new Tree<number>(1);
    expect(tree.find(1)).toBeTruthy();
    expect(tree.find(1)?.data).toBe(1);
  });

  it('add should add a node when parent exists', () => {
    const tree = new Tree<number>(1);
    const n2 = tree.add(2, 1);
    expect(n2?.data).toBe(2);
    expect(tree.find(2)).toBeTruthy();
    expect(tree.find(2)?.parentData).toBe(1);
  });

  it('add should log an error and return undefined when parent does not exist', () => {
    const tree = new Tree<number>(1);
    const errorSpy = jest
      .spyOn((tree as any)._logger, 'error')
      .mockImplementation(() => undefined as any);

    const res = tree.add(2, 999);
    expect(res).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('forEach should iterate over all nodes', () => {
    const tree = new Tree<number>(1);
    tree.add(2, 1);
    tree.add(3, 2);

    const visited: number[] = [];
    tree.forEach((n) => visited.push(n.data));

    expect(visited.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it('isDescendant / isAncestor should detect relationships', () => {
    const tree = new Tree<number>(1);
    tree.add(2, 1);
    tree.add(3, 2);

    expect(tree.isDescendant(3, 1)).toBe(true);
    expect(tree.isDescendant(1, 1)).toBe(false);
    expect(tree.isDescendant(3, 999 as any)).toBe(false);

    // Note: current implementation does NOT consider root an ancestor (loop stops at isRoot)
    expect(tree.isAncestor(1, 3)).toBe(false);
    expect(tree.isAncestor(2, 3)).toBe(true);
    expect(tree.isAncestor(3, 3)).toBe(false);
    expect(tree.isAncestor(999 as any, 3)).toBe(false);
  });

  it('getAllDescendants should return descendants (leafs)', () => {
    const tree = new Tree<number>(1);
    tree.add(2, 1);
    tree.add(3, 2);
    tree.add(4, 1);

    const descendants = tree.getAllDescendants().map((n) => n.data).sort((a, b) => a - b);
    // With the current logic, it returns leafs: 3 and 4 (not node 2 because it has a child)
    expect(descendants).toEqual([3, 4]);
  });
});

