import { env } from 'node:process';

export const BILATERAL_AI_PROCESSING_QUEUE_CLIENT =
  'BILATERAL_AI_PROCESSING_QUEUE_CLIENT';

export const BILATERAL_AI_PROCESSING_RMQ_PATTERN =
  env.BILATERAL_AI_PROCESSING_QUEUE?.trim() || 'bilateral_ai_processing';

export function isBilateralAiProcessingQueueConfigured(): boolean {
  return (
    !!env.BILATERAL_AI_PROCESSING_QUEUE?.trim() && !!env.RABBITMQ_URL?.trim()
  );
}
