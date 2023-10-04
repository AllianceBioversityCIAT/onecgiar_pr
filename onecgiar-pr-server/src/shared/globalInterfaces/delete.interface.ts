export interface LogicalDelete<T> {
  logicalDelete(resultId: number): Promise<T>;
}
