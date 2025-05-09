export class CognitoConfigDto {
  public grant_type?: string;
  public client_id: string;
  public client_secret: string;
  public code: string;
  public redirect_uri: string;
  public moreoptions?: CognitoMoreOptionsDto;
}

class CognitoMoreOptionsDto {
  public headers?: {
    'Content-Type'?: string;
    [key: string]: any;
  };
  public body?: {
    grant_type?: string;
    [key: string]: any;
  };
}

export class ResponseCognitoDto {
  public body: string;
  public headers: CognitoHeaderDto;
}

export class CognitoBodyDto {
  public grant_type: string;
  public client_id: string;
  public client_secret: string;
  public code: string;
  public redirect_uri: string;
}

export class CognitoHeaderDto {
  public auth: {
    username: string;
    password: string;
  };
  public headers: {
    'Content-Type': string;
    [key: string]: any;
  };
}
