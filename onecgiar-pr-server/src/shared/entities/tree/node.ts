/**
 * Adapted from https://code.tutsplus.com/articles/data-structures-with-javascript-tree--cms-23393
 */
export class Node<T> {
  public parent: Node<T>;
  public children: Node<T>[];
  constructor(public data: T) {
    this.parent = null;
    this.children = [];
  }

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get isRoot(): boolean {
    return !this.parent;
  }

  get hasChildren() {
    return !this.isLeaf;
  }

  get parentData(): T {
    return this.parent?.data;
  }

  get childrenData(): T[] {
    return this.children.map((c) => c.data);
  }
}
