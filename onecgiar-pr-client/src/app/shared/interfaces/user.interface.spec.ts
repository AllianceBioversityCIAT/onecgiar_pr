import { UserAuth, UserCreate, LocalStorageUser, UserChangePassword } from './user.interface';

describe('user.interface', () => {
  it('UserAuth should initialize defaults', () => {
    const ua = new UserAuth();
    expect(ua.email).toBe('');
    expect(ua.password).toBe('');
    expect(ua.confirmPassword).toBe('');
    ua.email = 'a@b.com';
    ua.password = 'x';
    ua.confirmPassword = 'y';
    expect(ua.email).toBe('a@b.com');
    expect(ua.password).toBe('x');
    expect(ua.confirmPassword).toBe('y');
  });

  it('should accept a valid UserCreate object', () => {
    const obj: UserCreate = {
      userData: { first_name: 'John', last_name: 'Doe', email: 'john@doe.com' },
      complementData: { password: 'secret' },
      role: 1
    };
    expect(obj.userData.first_name).toBe('John');
    expect(obj.complementData.password).toBe('secret');
    expect(obj.role).toBe(1);
  });

  it('should accept a valid LocalStorageUser', () => {
    const ls: LocalStorageUser = {
      id: 10,
      user_name: 'jdoe',
      email: 'j@d.com',
      user_acronym: 'JD'
    };
    expect(ls.id).toBe(10);
    expect(ls.user_name).toBe('jdoe');
    expect(ls.email).toBe('j@d.com');
    expect(ls.user_acronym).toBe('JD');
  });

  it('should accept a valid UserChangePassword', () => {
    const ucp: UserChangePassword = {
      session: 'token',
      newPassword: 'new-secret',
      username: 'jdoe'
    };
    expect(ucp.session).toBe('token');
    expect(ucp.newPassword).toBe('new-secret');
    expect(ucp.username).toBe('jdoe');
  });
});


