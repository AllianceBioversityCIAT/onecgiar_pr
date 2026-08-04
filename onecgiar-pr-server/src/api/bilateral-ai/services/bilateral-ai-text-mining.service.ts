import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { env } from 'node:process';

export interface TextMiningRequest {
  bucketName: string;
  keys: string[];
  audio_keys: string[];
  text?: string;
  user_id?: string;
  project_id?: number;
  program_code?: string;
}

@Injectable()
export class BilateralAiTextMiningService {
  private readonly logger = new Logger(BilateralAiTextMiningService.name);

  constructor(private readonly http: HttpService) {}

  async extract(request: TextMiningRequest): Promise<Record<string, unknown>> {
    const url = env.BILATERAL_AI_TEXT_MINING_URL?.trim();
    const apiKey =
      env.MICROSERVICE_API_KEY?.trim() ||
      env.BILATERAL_AI_TEXT_MINING_API_KEY?.trim();
    if (!url || !apiKey) {
      throw new ServiceUnavailableException(
        'Bilateral AI text mining is not configured.',
      );
    }
    try {
      this.logger.log(
        `Sending payload to bilateral AI text mining: ${JSON.stringify(request)}`,
      );

      const response = await firstValueFrom(
        this.http.post(`${url.replace(/\/$/, '')}/prms/text-mining`, request, {
          timeout: Number(env.BILATERAL_AI_TEXT_MINING_TIMEOUT_MS || 600_000),
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        }),
      );
      this.logger.log(
        `Received response from bilateral AI text mining: ${JSON.stringify(response.data)}`,
      );
      return response.data as Record<string, unknown>;
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.detail || 'Text mining service request failed.';
      const failure = new Error(message);
      (failure as any).status = status;
      throw failure;
    }
  }

  normalize(response: Record<string, unknown>): {
    results: Record<string, unknown>[];
    interactionId: string | null;
  } {
    const nested = response.json_content as Record<string, unknown> | undefined;
    const results = (nested?.results ?? response.results ?? []) as unknown;
    return {
      results: Array.isArray(results)
        ? (results as Record<string, unknown>[])
        : [],
      interactionId: (response.interaction_id as string | undefined) ?? null,
    };
  }
}
