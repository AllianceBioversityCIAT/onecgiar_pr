import { SetMetadata } from '@nestjs/common';

export const BILATERAL_CLARISA_ENDPOINT_KEY = 'bilateralClarisaEndpoint';

export const BilateralClarisaEndpoint = (endpointAccessed: string) =>
  SetMetadata(BILATERAL_CLARISA_ENDPOINT_KEY, endpointAccessed);
