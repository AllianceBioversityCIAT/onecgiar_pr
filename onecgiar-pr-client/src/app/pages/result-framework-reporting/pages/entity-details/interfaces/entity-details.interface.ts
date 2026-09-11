export interface OutcomesSummary {
  count: number;
  hasData: boolean;
}

/**
 * One entry of the additive `scopeBuckets[]` partition (`changes/overview-aow-cross-filter`
 * design.md §5, `OSF-T-3`). The server sends no display `label` — the client resolves copy
 * (`OSF-T-4`'s `scopeOptions`).
 */
export interface ScopeBucket {
  key: string;
  kind: 'aow' | 'outcome' | 'untagged';
  byStatus: Record<number, number>;
  total: number;
}

export interface EntityDetails {
  initiative: Initiative;
  parentUnit: Unit;
  units: Unit[];
  metadata: Metadata;
  intermediateOutcomes?: OutcomesSummary;
  outcomes2030?: OutcomesSummary;
  /** NEW additive (`OSF-R-2`, `OSF-R-4`) — total partition of the program's W1/W2 results. */
  scopeBuckets?: ScopeBucket[];
}

export interface Initiative {
  id: number;
  officialCode: string;
  name: string;
  shortName: string;
}

export interface Metadata {
  activeYear: number;
  portfolio: number;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  composeCode: string;
  level: number;
  year: number;
  parentId?: string;
  progress: number;
  resultsCount?: {
    editing: number;
    submitted: number;
    /** NEW additive (`OSF-DD-1`) — all statuses, kept beside `editing`/`submitted` rather than
     *  replacing them (two shipped consumers still read those two directly). */
    byStatus?: Record<number, number>;
  };
}
