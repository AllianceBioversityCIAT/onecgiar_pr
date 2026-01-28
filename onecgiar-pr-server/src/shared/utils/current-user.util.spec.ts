import { CurrentUserUtil, SetAutitEnum } from './current-user.util';

describe('CurrentUserUtil', () => {
  const makeRequest = (user?: any) => ({ user } as any);

  it('should take the user from request when there is no systemUser', () => {
    const util = new CurrentUserUtil(makeRequest({ id: 7, email: 'a@b.c' }));
    expect(util.user_id).toBe(7);
    expect(util.email).toBe('a@b.c');
    expect(util.user).toEqual({ id: 7, email: 'a@b.c' });
  });

  it('should use systemUser when it is set', () => {
    const util = new CurrentUserUtil(makeRequest({ id: 1, email: 'req@x' }));
    util.setSystemUser({ id: 9, email: 'sys@x' });
    expect(util.user_id).toBe(9);
    expect(util.email).toBe('sys@x');
  });

  it('should force systemUser when forceSystemUser=true (even if it is null)', () => {
    const util = new CurrentUserUtil(makeRequest({ id: 1, email: 'req@x' }));
    util.setSystemUser(null as any, true);
    expect(util.user).toBeNull();
    expect(util.user_id).toBeUndefined();
    expect(util.email).toBeUndefined();
  });

  it('clearSystemUser should restore the user from request', () => {
    const util = new CurrentUserUtil(makeRequest({ id: 7, email: 'a@b.c' }));
    util.setSystemUser({ id: 9, email: 'sys@x' }, true);
    util.clearSystemUser();
    expect(util.user_id).toBe(7);
    expect(util.email).toBe('a@b.c');
  });

  it('audit should return correct fields based on SetAutitEnum', () => {
    const util = new CurrentUserUtil(makeRequest({ id: 7, email: 'a@b.c' }));
    expect(util.audit(SetAutitEnum.NEW)).toEqual({ created_by: 7 });
    expect(util.audit(SetAutitEnum.UPDATE)).toEqual({ last_updated_by: 7 });
    expect(util.audit(SetAutitEnum.BOTH)).toEqual({
      created_by: 7,
      last_updated_by: 7,
    });
  });
});

