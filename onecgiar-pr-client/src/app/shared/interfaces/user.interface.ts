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

export interface UserChangePassword {
  session: string;
  newPassword: string;
  username: string;
}
