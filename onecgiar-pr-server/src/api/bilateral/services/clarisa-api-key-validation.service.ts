import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { env } from 'node:process';
import { firstValueFrom } from 'rxjs';
import { BILATERAL_CLARISA_MICROSERVICE_NAME } from '../constants/bilateral-auth.constants';
import {
  ClarisaApiKeyValidationRequest,
  ClarisaApiKeyValidationResponse,
  ClarisaApiKeyValidationSuccess,
} from '../interfaces/clarisa-api-key-validation.interface';

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }
  return value.slice(0, end);
}

@Injectable()
export class ClarisaApiKeyValidationService {
  private readonly logger = new Logger(ClarisaApiKeyValidationService.name);
  private readonly validateUrl: string;

  constructor(private readonly httpService: HttpService) {
    const baseUrl = trimTrailingSlashes(env.CLA_VALIDATE_URL ?? '');
    this.validateUrl = `${baseUrl}/api/auth/validate-api-key`;
  }

  /**
   * Returns the full CLARISA success payload — not just a boolean — so callers can keep the
   * calling system's identity (`mis`). That identity is the only trustworthy one available:
   * CLARISA resolves it from the API key itself, whereas the `tenant` field in the request body
   * is declared by the caller. P2-3166 needs it to know which platform a result came from.
   *
   * `null` means "not valid", which is what the guard turns into a 401.
   */
  async validate(
    apiKey: string,
    endpointAccessed: string,
    ipAddress?: string,
  ): Promise<ClarisaApiKeyValidationSuccess | null> {
    const payload: ClarisaApiKeyValidationRequest = {
      api_key: apiKey,
      microservice_name: BILATERAL_CLARISA_MICROSERVICE_NAME,
      endpoint_accessed: endpointAccessed,
    };

    if (ipAddress) {
      payload.ip_address = ipAddress;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<ClarisaApiKeyValidationResponse>(
          this.validateUrl,
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000,
          },
        ),
      );

      return response.data?.valid === true
        ? (response.data as ClarisaApiKeyValidationSuccess)
        : null;
    } catch (error) {
      const axiosError = error as AxiosError<ClarisaApiKeyValidationResponse>;

      if (axiosError.response?.data?.valid === false) {
        return null;
      }

      this.logger.warn(
        `CLARISA API key validation failed for endpoint ${endpointAccessed}`,
      );
      return null;
    }
  }
}
