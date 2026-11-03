export interface ClarisaApiKeyValidationRequest {
  api_key: string;
  microservice_name: string;
  endpoint_accessed: string;
  ip_address?: string;
}

export interface ClarisaApiKeyValidationMis {
  id: number;
  name: string;
  acronym: string;
}

export interface ClarisaApiKeyValidationSuccess {
  valid: true;
  mis: ClarisaApiKeyValidationMis;
  environment: string;
  scopes: string[];
  /** The key's CLARISA endpoint list; `[]` for a key without one. */
  allowed_endpoints?: string[];
  /** `true` only when `endpoint_accessed` is in `allowed_endpoints`. */
  endpoint_allowed?: boolean;
}

export interface ClarisaApiKeyValidationFailure {
  valid: false;
  error?: string;
}

export type ClarisaApiKeyValidationResponse =
  | ClarisaApiKeyValidationSuccess
  | ClarisaApiKeyValidationFailure;
