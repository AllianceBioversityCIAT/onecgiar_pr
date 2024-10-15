export class EventType<T> {
  public static readonly ADD = 'ADD';
  public static readonly DELETE = 'DELETE';

  private readonly type: string;
  private readonly data: T;

  private constructor(type: 'ADD' | 'DELETE', data: T) {
    this.type = type;
    this.data = data;
  }

  public static createAddEvent<T>(data: T): EventType<T> {
    return new EventType<T>(EventType.ADD, data);
  }

  public static createDeleteEvent<T>(data: T): EventType<T> {
    return new EventType<T>(EventType.DELETE, data);
  }

  public getData() {
    return this.data;
  }

  public getEventType() {
    return this.type;
  }

  public static isAdding<T>(event: EventType<T>): event is EventType<T> {
    return event.type === EventType.ADD;
  }

  public static isDeleting<T>(event: EventType<T>): event is EventType<T> {
    return event.type === EventType.DELETE;
  }
}
