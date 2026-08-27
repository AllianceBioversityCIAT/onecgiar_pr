export interface AddUser {
  firstName: string;
  lastName: string;
  emailAddress: string;
  cgIAR: string;
  isCGIAR: boolean;
  appRole?: string;
  entities?: string[];
  centers?: string[];
  userStatus: string;
  userStatusClass?: string;
  userCreationDate: string;
  isActive: boolean;
  createdByFirstName?: string;
  createdByLastName?: string;
  createdByEmail?: string;
}
