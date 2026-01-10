import type { createLogger } from '~/server/utils/logger';
export type Logger = ReturnType<typeof createLogger>;
export type TarkovGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; [key: string]: unknown }>;
};
/**
 * Custom error for GraphQL response validation failures
 */
export class GraphQLResponseError extends Error {
  constructor(
    message: string,
    public readonly errors?: Array<{ message: string; [key: string]: unknown }>
  ) {
    super(message);
    this.name = 'GraphQLResponseError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLResponseError);
    }
    Object.setPrototypeOf(this, GraphQLResponseError.prototype);
  }
}
/**
 * Type guard to validate GraphQL response structure
 */
export function isValidGraphQLResponse<T>(response: unknown): response is TarkovGraphqlResponse<T> {
  return (
    response !== null &&
    typeof response === 'object' &&
    ('data' in response || 'errors' in response)
  );
}
/**
 * Validates GraphQL response and narrows type to ensure data.data exists
 * @param response - The raw response from the GraphQL API
 * @param logger - Logger instance for warning messages
 * @param allowPartialData - If true, allows responses with errors as long as data exists
 * @throws GraphQLResponseError if response is invalid or contains errors
 */
export function validateGraphQLResponse<T>(
  response: unknown,
  logger: Logger,
  allowPartialData = false
): asserts response is TarkovGraphqlResponse<T> & { data: T } {
  // Check basic structure
  if (!isValidGraphQLResponse<T>(response)) {
    throw new GraphQLResponseError('Invalid GraphQL response structure');
  }
  // Check for missing or invalid data field (covers both missing property and null/undefined value)
  if (response.data === null || response.data === undefined) {
    throw new GraphQLResponseError('GraphQL response missing or invalid data field');
  }
  const errors = Array.isArray(response.errors) ? response.errors : [];
  const hasErrors = errors.length > 0;
  // Check for GraphQL errors (only throw if not allowing partial data)
  if (!allowPartialData && hasErrors) {
    const errorMessages = errors.map((e) => e.message).join('; ');
    throw new GraphQLResponseError(`GraphQL errors: ${errorMessages}`, errors);
  }
  // If we have partial data and errors, log them but don't throw
  if (allowPartialData && hasErrors) {
    const sanitizedErrors = errors.map((error) => {
      const sanitized: { message: string; locations?: unknown; path?: unknown } = {
        message: error.message,
      };
      if (Array.isArray(error.locations)) {
        sanitized.locations = error.locations;
      }
      if (Array.isArray(error.path)) {
        sanitized.path = error.path;
      }
      return sanitized;
    });
    logger.warn('GraphQL response contains errors but returning partial data', {
      errors: sanitizedErrors,
    });
  }
}
