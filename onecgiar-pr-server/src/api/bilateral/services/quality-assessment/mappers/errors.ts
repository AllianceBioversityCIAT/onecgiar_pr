// @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-4)

/**
 * Thrown when a picker (ToC node, indicator, or similar) is present in the enriched detail
 * only as an id, and no read the builder consumes carries the matching label — design.md §5
 * "Payload builder" / `BIL-QAI-DD-2`: "never emit an empty label silently". The orchestrator
 * (`BIL-QAI-T-6`) is expected to map this to the same 400 path as any other precondition
 * failure; it is never swallowed into a null field.
 */
export class UnresolvableLabelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnresolvableLabelError';
  }
}

/**
 * Thrown by `BilateralQualityPayloadBuilder.build()` when
 * `ResultsService.getBilateralResultById` — the centre-form read the builder treats as
 * authoritative for labels the enriched detail lacks (design.md §5 `DD-2`) — reports a
 * non-2xx status. Today the only such case is `results.service.ts`
 * `getBilateralResultById`'s early return when the result row does not exist:
 * `{ response: {}, message: 'Bilateral result not found', status: HttpStatus.NOT_FOUND }`.
 * Continuing with the resulting empty `formDetail` would silently build a payload against a
 * result that was never actually read — fail fast instead of guessing.
 */
export class BilateralResultFormReadError extends Error {
  constructor(
    public readonly resultId: number,
    public readonly status: number,
    formMessage?: string,
  ) {
    super(
      `Unable to read the bilateral result form detail for resultId=${resultId} ` +
        `(status=${status}${formMessage ? `, message="${formMessage}"` : ''}).`,
    );
    this.name = 'BilateralResultFormReadError';
  }
}
