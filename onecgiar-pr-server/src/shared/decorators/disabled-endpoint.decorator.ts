import { SetMetadata } from '@nestjs/common';

export const DISABLED_ENDPOINT_KEY = 'disabledEndpoint';

/**
 * Marks the endpoint as disabled. When used together with DisabledEndpointGuard,
 * requests to this endpoint will receive 404 Not Found.
 */
export const DisabledEndpoint = () => SetMetadata(DISABLED_ENDPOINT_KEY, true);
