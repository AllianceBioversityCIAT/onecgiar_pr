export class UserAuth {
  public email: string = '';
  public password: string = '';
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
