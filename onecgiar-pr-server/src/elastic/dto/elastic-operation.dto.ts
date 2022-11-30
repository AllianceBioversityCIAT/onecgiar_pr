export class ElasticOperationDto<T> {
  constructor(public operation: 'DELETE' | 'POST', public data: T) {}
}
