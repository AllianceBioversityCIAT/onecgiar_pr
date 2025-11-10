import { User } from './User';

describe('User class', () => {
  it('should construct with name and userId', () => {
    const u = new User('Alice', 123);
    expect(u.name).toBe('Alice');
    expect(u.userId).toBe(123);
  });

  it('should allow updating properties and setting userId to null', () => {
    const u = new User('Bob', 456);
    u.name = 'Bobby';
    u.userId = null;
    expect(u.name).toBe('Bobby');
    expect(u.userId).toBeNull();
  });
});


