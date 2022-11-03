export class EvidencesBody {
  public result_id: number;
  public evidences: EvidencesCreateInterface[] = [];
  public supplementary: EvidencesCreateInterface[] = [];
}

export interface EvidencesCreateInterface {
  is_knowledge_product?: boolean;
  link?: string;
  description?: string;
  gender_related?: boolean;
  youth_related?: boolean;
}
