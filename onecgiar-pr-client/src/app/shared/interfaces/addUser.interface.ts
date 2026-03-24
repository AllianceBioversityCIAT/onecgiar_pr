export interface AddUser {
  firstName: string;
  lastName: string;
  emailAddress: string;
  cgIAR: string;
  isCGIAR: boolean;
  userStatus: string;
  userCreationDate: string;
  isActive: boolean;
  createdByFirstName?: string;
  createdByLastName?: string;
  createdByEmail?: string;
}
