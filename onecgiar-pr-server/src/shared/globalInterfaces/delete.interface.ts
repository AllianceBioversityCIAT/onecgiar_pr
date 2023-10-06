export interface LogicalDelete<T> {
  logicalDelete(resultId: number): Promise<T>;

  fisicalDelete(resultId: number): Promise<any>;
}
