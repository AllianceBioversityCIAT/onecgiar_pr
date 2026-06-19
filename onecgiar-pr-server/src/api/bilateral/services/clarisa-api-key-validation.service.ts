import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import { env } from 'process';
import { firstValueFrom } from 'rxjs';
import { BILATERAL_CLARISA_MICROSERVICE_NAME } from '../constants/bilateral-auth.constants';
import {
  ClarisaApiKeyValidationRequest,
  ClarisaApiKeyValidationResponse,
} from '../interfaces/clarisa-api-key-validation.interface';

@Injectable()
export class ClarisaApiKeyValidationService {
  private readonly logger = new Logger(ClarisaApiKeyValidationService.name);
  private readonly validateUrl: string;

  constructor(private readonly httpService: HttpService) {
    const baseUrl = (env.CLA_URL ?? '').replace(/\/+$/, '');
    this.validateUrl = `${baseUrl}/api/auth/validate-api-key`;
  }

  async validate(
    apiKey: string,
    endpointAccessed: string,
    ipAddress?: string,
  ): Promise<boolean> {
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

      return response.data?.valid === true;
    } catch (error) {
      const axiosError = error as AxiosError<ClarisaApiKeyValidationResponse>;

      if (axiosError.response?.data?.valid === false) {
        return false;
      }

      this.logger.warn(
        `CLARISA API key validation failed for endpoint ${endpointAccessed}`,
      );
      return false;
    }
  }
}
