export class ExceptionMessage {
  public static readonly AWS_AUTHORIZATION_CODE: string =
    'Authorization Code does not exist or expired';
  public static readonly JWT_NOT_FOUND: string =
    'Authentication token not found. Please log in to obtain a new token.';
  public static readonly JWT_INVALID: string =
    'The provided authentication token is not valid. Check the integrity of your token or log in to obtain a new one.';
  public static readonly JWT_EXPIRED: string =
    'The authentication token has expired. Please log in again to obtain an updated token.';
  public static readonly JWT_ERROR: string =
    'An error occurred with the authentication token. Verify the validity and structure of the token or log in to obtain a new one.';
}
