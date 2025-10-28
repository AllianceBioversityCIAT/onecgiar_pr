export interface UserSearchResponse {
  message: string;
  response: User[];
  status: number;
}

export interface User {
  cn: string;
  display_name: string;
  mail: string;
  sAMAccountName: string;
  givenName: string;
  sn: string;
  userPrincipalName: string;
  title: string;
  department: string;
  company: string;
  manager: string;
  employeeID: string;
  employeeNumber: string;
  employeeType: string;
  description: string;
  formattedName: string;
}
