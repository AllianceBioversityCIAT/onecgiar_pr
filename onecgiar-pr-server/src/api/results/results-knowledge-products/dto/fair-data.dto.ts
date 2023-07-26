export class FullFairData {
  total_score: number;
  F: FairSpecificData;
  A: FairSpecificData;
  I: FairSpecificData;
  R: FairSpecificData;
}

export class FairSpecificData {
  name?: string;
  description?: string;
  score: number;
  indicators?: FairSpecificData[];
}
