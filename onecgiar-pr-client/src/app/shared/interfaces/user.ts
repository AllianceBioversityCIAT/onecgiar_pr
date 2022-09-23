export class UserAuth {
  public email: string = 'yecksin@gmail.com';
  public password: string = '88888888';
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
