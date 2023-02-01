import { Logger } from '@nestjs/common';
import { Node } from './node';

/**
 * Adapted from https://code.tutsplus.com/articles/data-structures-with-javascript-tree--cms-23393
 */
export class Tree<T> {
  private _root: Node<T>;
  private readonly _logger: Logger = new Logger(Tree.name);
  constructor(data: T) {
    let node = new Node(data);
    this._root = node;
  }

  public add(data: T, parentData: T): Node<T> {
    let node = new Node(data);
    let parent = this.find(parentData);

    //if the parent exists, add this node
    if (parent) {
      parent.children.push(node);
      node.parent = parent;
      //return this node

      return node;
    } else {
      //otherwise throw an error
      this._logger.error(
        `Cannot add node: parent with data ${JSON.stringify(
          parentData,
        )} not found.`,
      );
    }
  }

  public find(data: T, node = this._root): Node<T> {
    //if the current node matches the data, return it
    if (this.dataEquals(node.data, data)) {
      return node;
    }

    //recurse on each child node
    for (let child of node.children) {
      //if the data is found in any child node it will be returned here
      const findResult = this.find(data, child);
      if (findResult) {
        return findResult;
      }
    }

    //otherwise, the data was not found
    return null;
  }

  public forEach(callback: (node: Node<T>) => void, node = this._root) {
    //recurse on each child node
    for (let child of node.children) {
      //if the data is found in any child node it will be returned here
      this.forEach(callback, child);
    }

    //otherwise, the data was not found
    callback(node);
  }

  protected dataEquals(obj1: T, obj2: T): boolean {
    return obj1 == obj2;
  }

  public isDescendant(descendant: T, ancestor: T): boolean {
    if (this.dataEquals(descendant, ancestor)) {
      return false;
    }

    const nodeAncestor = this.find(ancestor);

    if (!nodeAncestor) {
      return false;
    }

    return !!this.find(descendant, nodeAncestor);
  }

  public isAncestor(ancestor: T, descendant: T): boolean {
    if (this.dataEquals(descendant, ancestor)) {
      return false;
    }

    const nodeDescendant = this.find(descendant);

    if (!nodeDescendant) {
      return false;
    }

    let currentNode = nodeDescendant.parent;
    while (currentNode) {
      if (this.dataEquals(currentNode.data, ancestor)) {
        return true;
      }

      currentNode = currentNode.parent;
    }

    return false;
  }
}
