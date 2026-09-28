export class UserAuth {
  public email: string = '';
  public password: string = '';
  public confirmPassword?: string = '';
}

export interface UserCreate {
  userData: UserData;
  complementData: ComplementData;
  role: number;
}

interface ComplementData {
  password: string;
}

interface UserData {
  first_name: string;
  last_name: string;
  email: string;
}

export interface LocalStorageUser {
  id: number;
  user_name: string;
  user_acronym?: string;
  email: string;
}

export interface UserLastLoginRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_cgiar: number;
  active: number;
  last_login: string | null;
  days_since_last_login: number | null;
}

export interface UserChangePassword {
  session: string;
  newPassword: string;
  username: string;
}
